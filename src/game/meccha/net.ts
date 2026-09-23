// שכבת רשת אחת לשלושה מצבים:
//  - local: משחק לבד (עם בוטים)
//  - room: חדר חי של דף ה־Artifact ב־claude.ai (כל מי שפתח את הדף)
//  - p2p: חדר WebRTC עם קוד (באתר עצמו), המארח מעביר הודעות לכולם
import type { DataConnection, Peer as PeerType } from "peerjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Presence = Record<string, any>;

export interface NetPeer {
  id: string;
  me: boolean;
  p: Presence;
}

export interface Net {
  kind: "local" | "room" | "p2p";
  code?: string;
  selfId(): string;
  peers(): NetPeer[];
  onPeers(fn: () => void): () => void;
  setPresence(patch: Presence): void;
  emit(topic: string, data: unknown): void;
  on(topic: string, fn: (data: unknown, from: string) => void): () => void;
  connected(): boolean;
  close(): void;
}

// ---------- מקומי ----------

export function createLocalNet(): Net {
  let pres: Presence = {};
  const peerFns = new Set<() => void>();
  return {
    kind: "local",
    selfId: () => "me",
    peers: () => [{ id: "me", me: true, p: pres }],
    onPeers(fn) { peerFns.add(fn); return () => peerFns.delete(fn); },
    setPresence(patch) { pres = { ...pres, ...patch }; peerFns.forEach((f) => f()); },
    emit() {},
    on() { return () => {}; },
    connected: () => true,
    close() {},
  };
}

// ---------- חדר claude.ai ----------

interface RoomLike {
  emit(topic: string, data?: unknown): Promise<void>;
  on(topic: string, h: (m: { data?: unknown; peer: string; sameTab: boolean }) => void): () => void;
  presence(patch: Presence): Promise<void>;
  peers(): readonly { peer: string; sameTab: boolean; kind: string; presence: Presence }[];
  onPeers(h: (c: { peers: readonly { peer: string; sameTab: boolean }[] }) => void): () => void;
  connected(): boolean;
}

export async function tryRoomNet(): Promise<Net | null> {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { claude?: { use(n: string): Promise<unknown> } };
  if (!w.claude?.use) return null;
  let room: RoomLike | null = null;
  try {
    room = (await w.claude.use("room")) as RoomLike | null;
  } catch {
    room = null;
  }
  if (!room) return null;
  const r = room;
  // מחכים שהפלטפורמה תגיד לנו מי אנחנו
  const self = await new Promise<string | null>((resolve) => {
    const t = window.setTimeout(() => resolve(null), 4000);
    const off = r.onPeers((c) => {
      const me = c.peers.find((p) => p.sameTab);
      if (me) {
        window.clearTimeout(t);
        off();
        resolve(me.peer);
      }
    });
  });
  if (!self) return null;
  let pending: Presence = {};
  let timer = 0;
  return {
    kind: "room",
    selfId: () => self,
    peers: () =>
      r.peers()
        .filter((p) => p.kind === "viewer")
        .map((p) => ({ id: p.peer, me: p.sameTab, p: (p.presence ?? {}) as Presence })),
    onPeers(fn) { return r.onPeers(() => fn()); },
    setPresence(patch) {
      pending = { ...pending, ...patch };
      if (timer) return;
      timer = window.setTimeout(() => {
        timer = 0;
        const p = pending;
        pending = {};
        r.presence(p).catch(() => {});
      }, 60);
    },
    emit(topic, data) { r.emit(topic, data).catch(() => {}); },
    on(topic, fn) {
      return r.on(topic, (m) => {
        if (m.sameTab) return;
        fn(m.data, m.peer);
      });
    },
    connected: () => r.connected(),
    close() {},
  };
}

// ---------- WebRTC (PeerJS) ----------

const PREFIX = "mcham-he-";

export function randomCode() {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

type Wire =
  | { k: "p"; p: Presence }
  | { k: "P"; list: [string, Presence][] }
  | { k: "e"; t: string; d: unknown }
  | { k: "E"; t: string; d: unknown; f: string };

export async function createP2PNet(code: string, host: boolean): Promise<Net> {
  const { Peer } = await import("peerjs");
  const hostId = PREFIX + code.toUpperCase();
  const peer: PeerType = host ? new Peer(hostId) : new Peer();
  const myId = await new Promise<string>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("timeout")), 12000);
    peer.on("open", (id) => { window.clearTimeout(t); resolve(id); });
    peer.on("error", (e: { type?: string }) => {
      window.clearTimeout(t);
      reject(new Error(e.type === "unavailable-id" ? "הקוד תפוס — נסו קוד אחר" : e.type === "peer-unavailable" ? "לא נמצא חדר עם הקוד הזה" : "החיבור נכשל"));
    });
  });

  const pres = new Map<string, Presence>();
  let mine: Presence = {};
  const peerFns = new Set<() => void>();
  const topicFns = new Map<string, Set<(d: unknown, from: string) => void>>();
  const conns = new Map<string, DataConnection>();
  let hostConn: DataConnection | null = null;
  let ok = host;
  let dirty = true;
  const firePeers = () => peerFns.forEach((f) => f());
  const deliver = (t: string, d: unknown, f: string) => topicFns.get(t)?.forEach((fn) => fn(d, f));

  if (host) {
    pres.set(myId, mine);
    peer.on("connection", (c) => {
      c.on("open", () => {
        conns.set(c.peer, c);
        dirty = true;
      });
      c.on("data", (raw) => {
        const m = raw as Wire;
        if (m.k === "p") {
          pres.set(c.peer, m.p);
          dirty = true;
          firePeers();
        } else if (m.k === "e") {
          for (const [id, cc] of conns) if (id !== c.peer && cc.open) cc.send({ k: "E", t: m.t, d: m.d, f: c.peer } satisfies Wire);
          deliver(m.t, m.d, c.peer);
        }
      });
      const drop = () => {
        conns.delete(c.peer);
        pres.delete(c.peer);
        dirty = true;
        firePeers();
      };
      c.on("close", drop);
      c.on("error", drop);
    });
  } else {
    await new Promise<void>((resolve, reject) => {
      const c = peer.connect(hostId, { reliable: true });
      const t = window.setTimeout(() => reject(new Error("לא נמצא חדר עם הקוד הזה")), 12000);
      peer.on("error", (e: { type?: string }) => {
        window.clearTimeout(t);
        reject(new Error(e.type === "peer-unavailable" ? "לא נמצא חדר עם הקוד הזה" : "החיבור נכשל"));
      });
      c.on("open", () => {
        window.clearTimeout(t);
        hostConn = c;
        ok = true;
        resolve();
      });
      c.on("data", (raw) => {
        const m = raw as Wire;
        if (m.k === "P") {
          pres.clear();
          for (const [id, p] of m.list) pres.set(id, id === myId ? mine : p);
          firePeers();
        } else if (m.k === "E") deliver(m.t, m.d, m.f);
      });
      c.on("close", () => { ok = false; pres.clear(); pres.set(myId, mine); firePeers(); });
    });
    pres.set(myId, mine);
  }

  // שליחת נוכחות בקצב קבוע
  let sendDirty = true;
  const iv = window.setInterval(() => {
    if (host) {
      if (!dirty) return;
      dirty = false;
      const list = [...pres.entries()] as [string, Presence][];
      for (const cc of conns.values()) if (cc.open) cc.send({ k: "P", list } satisfies Wire);
    } else if (sendDirty && hostConn?.open) {
      sendDirty = false;
      hostConn.send({ k: "p", p: mine } satisfies Wire);
    }
  }, 70);

  return {
    kind: "p2p",
    code: code.toUpperCase(),
    selfId: () => myId,
    peers: () => [...pres.entries()].map(([id, p]) => ({ id, me: id === myId, p })),
    onPeers(fn) { peerFns.add(fn); return () => peerFns.delete(fn); },
    setPresence(patch) {
      mine = { ...mine, ...patch };
      pres.set(myId, mine);
      dirty = true;
      sendDirty = true;
    },
    emit(t, d) {
      if (host) {
        for (const cc of conns.values()) if (cc.open) cc.send({ k: "E", t, d, f: myId } satisfies Wire);
      } else if (hostConn?.open) hostConn.send({ k: "e", t, d } satisfies Wire);
    },
    on(t, fn) {
      if (!topicFns.has(t)) topicFns.set(t, new Set());
      topicFns.get(t)!.add(fn);
      return () => topicFns.get(t)?.delete(fn);
    },
    connected: () => ok,
    close() {
      window.clearInterval(iv);
      try { peer.destroy(); } catch { /* ignore */ }
    },
  };
}
