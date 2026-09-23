import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Volume2, VolumeX, Home, Copy, X, Pipette, Send } from "lucide-react";
import type { Engine, HudState, Settings } from "@/game/meccha/engine";
import type { PoseId, SizeId, BodyType } from "@/game/meccha/character";
import type { Net } from "@/game/meccha/net";
import { setMuted as setSoundMuted } from "@/lib/sound";

// מחרוזות הממשק לקוחות מהגרסה האנגלית של המשחק המקורי (בלי תרגומים מומצאים)
const FONT = `"M PLUS Rounded 1c", "Nunito", system-ui, sans-serif`;
const OUTLINE = "0 2px 0 #000, 0 -1px 0 #000, 1px 0 0 #000, -1px 0 0 #000, 0 0 6px rgba(0,0,0,.6)";
const PLAYER_COLORS = ["#ff006e", "#3a86ff", "#ffbe0b", "#8338ec", "#fb5607", "#06d6a0", "#ef476f", "#118ab2"];
const MAP_LIST = [
  { id: "random", name: "Random" },
  { id: "mansion", name: "Hide-and-Seek Mansion" },
  { id: "country", name: "Indoor Country" },
  { id: "sewer", name: "Sewer" },
  { id: "backrooms", name: "Backrooms" },
  { id: "penguin", name: "Penguin Hotel" },
  { id: "sugarland", name: "Sugarland" },
  { id: "osaka", name: "Osaka" },
];
const MODES: { id: Settings["mode"]; name: string }[] = [
  { id: "normal", name: "Normal" },
  { id: "infection", name: "Infection" },
  { id: "double", name: "Double" },
];
const POSE_PAGES: PoseId[][] = [
  ["stand", "sit", "lie", "spread", "lump", "cactus", "surrender", "side"],
  ["crosslegged", "bridge", "onehand", "bend", "tpose", "hips", "handstand", "banzai"],
];
const POSE_NAME: Record<PoseId, string> = {
  stand: "Stand", sit: "Sit", lie: "Lie Down", spread: "Spread", lump: "Lump", cactus: "Cactus", surrender: "Surrender", side: "Side",
  crosslegged: "Cross-legged", bridge: "Bridge", onehand: "One Hand", bend: "Bend", tpose: "T-Pose", hips: "Hands on Hips",
  handstand: "Handstand", banzai: "Banzai", crouch: "Crouch",
};
const SIZE_LIST: { id: SizeId; name: string }[] = [
  { id: "petit", name: "Petit" }, { id: "small", name: "Small" }, { id: "normal", name: "Normal" }, { id: "large", name: "Large" }, { id: "huge", name: "Huge" },
];
const BODY_LIST: { id: BodyType; name: string }[] = [{ id: "normal", name: "Normal" }, { id: "cube", name: "Cube" }, { id: "plump", name: "Plump" }];

function loadName() {
  try { return localStorage.getItem("meccha_name") || ""; } catch { return ""; }
}
function saveName(n: string) {
  try { localStorage.setItem("meccha_name", n); } catch { /* ignore */ }
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

type Conn = { kind: "local" } | { kind: "room" } | { kind: "p2p"; code: string; host: boolean };

export function MecchaGame() {
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [name, setName] = useState("");
  const [color, setColor] = useState(PLAYER_COLORS[0]);
  const [muted, setMuted] = useState(false);
  const [conn, setConn] = useState<Conn>({ kind: "local" });
  const [roomNet, setRoomNet] = useState<Net | null | undefined>(undefined);
  const [joinCode, setJoinCode] = useState("");
  const [search, setSearch] = useState(false);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    setName(loadName() || `Player${Math.floor(Math.random() * 900 + 100)}`);
    setColor(PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)]);
    let alive = true;
    import("@/game/meccha/net")
      .then(({ tryRoomNet }) => tryRoomNet())
      .then((n) => { if (alive) setRoomNet(n); })
      .catch(() => { if (alive) setRoomNet(null); });
    return () => { alive = false; };
  }, []);

  function toggleMute() {
    setMuted((m) => { setSoundMuted(!m); return !m; });
  }
  function go(c: Conn) {
    saveName(name.trim() || "Player");
    setConn(c);
    setRunId((r) => r + 1);
    setScreen("game");
  }

  if (screen === "game")
    return (
      <GameView key={runId} conn={conn} roomNet={roomNet ?? null} name={name.trim().slice(0, 14) || "Player"} color={color}
        muted={muted} onToggleMute={toggleMute} onExit={() => setScreen("menu")} />
    );

  const btn = "w-full rounded-2xl py-3.5 text-lg font-extrabold transition hover:scale-[1.02] active:scale-95 border-[3px] border-black shadow-[0_4px_0_#000]";
  return (
    <div className="relative min-h-screen overflow-hidden" dir="ltr" style={{ fontFamily: FONT, background: "radial-gradient(circle at 30% 20%, #ffe36e 0, #ff9f1c 35%, #ff4d6d 70%, #7b2cbf 100%)" }}>
      <div className="absolute inset-0 opacity-25 pointer-events-none" style={{ backgroundImage: "radial-gradient(#fff 2px, transparent 2px)", backgroundSize: "26px 26px" }} />
      <div className="relative z-10 mx-auto max-w-md px-4 py-6 text-black">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="rounded-xl bg-black/30 text-white px-3 py-2 text-sm font-bold inline-flex items-center gap-2"><Home className="w-4 h-4" /> Home</Link>
          <button onClick={toggleMute} className="rounded-xl bg-black/30 text-white p-2.5" aria-label="Mute">
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
        <div className="text-center mb-7 select-none">
          <div className="text-[44px] sm:text-[56px] leading-[0.95] font-black text-white tracking-tight" style={{ textShadow: "0 5px 0 #000, 3px 0 0 #000, -3px 0 0 #000, 0 -3px 0 #000" }}>
            MECCHA<br /><span style={{ color: "#8ef56b" }}>CHAMELEON</span>
          </div>
        </div>

        <div className="rounded-3xl bg-white/90 border-[3px] border-black p-4 mb-4 grid gap-3 shadow-[0_6px_0_#000]">
          <label className="grid gap-1">
            <span className="font-extrabold text-sm">Name</span>
            <input id="meccha-name" value={name} maxLength={14} onChange={(e) => setName(e.target.value)}
              className="bg-white border-2 border-black rounded-xl px-3 py-2 text-base font-bold outline-none" />
          </label>
          <div className="flex gap-1.5 justify-center">
            {PLAYER_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} aria-label={c}
                className={`w-8 h-8 rounded-full border-[3px] ${color === c ? "border-black scale-110" : "border-white"}`} style={{ background: c }} />
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          {roomNet && <button onClick={() => go({ kind: "room" })} className={`${btn} bg-[#8ef56b]`}>Join This Page&apos;s Server</button>}
          <button onClick={async () => { const { randomCode } = await import("@/game/meccha/net"); go({ kind: "p2p", code: randomCode(), host: true }); }}
            className={`${btn} bg-[#ffd23f]`}>Create Server</button>
          {!search ? (
            <button onClick={() => setSearch(true)} className={`${btn} bg-[#4cc9f0]`}>Search Server</button>
          ) : (
            <div className="flex gap-2">
              <input id="meccha-code" autoFocus value={joinCode} placeholder="CODE"
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
                className="flex-1 min-w-0 bg-white border-[3px] border-black rounded-2xl px-3 text-2xl tracking-[0.3em] text-center font-black outline-none" />
              <button disabled={joinCode.length !== 5} onClick={() => go({ kind: "p2p", code: joinCode, host: false })}
                className={`${btn} !w-auto px-5 bg-[#4cc9f0] disabled:opacity-40`}>Join</button>
            </div>
          )}
          <button onClick={() => go({ kind: "local" })} className={`${btn} bg-white`}>Practice (Solo + Bots)</button>
          {roomNet === undefined && <p className="text-xs text-white/80 text-center">Checking for a shared server…</p>}
        </div>

        <details className="mt-5 rounded-2xl bg-black/35 text-white p-4 text-sm leading-relaxed">
          <summary className="font-extrabold cursor-pointer">Controls</summary>
          <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px]">
            {[
              ["WASD", "Move"], ["Mouse", "Camera (click to lock)"], ["Space", "Jump / Stick to wall (mid-air)"], ["Shift", "Leave wall"],
              ["Ctrl", "Crouch"], ["F", "Paint mode"], ["Hold Space", "Eyedropper (paint mode)"], ["Right drag", "Brush size"],
              ["V", "Shadow on/off (paint mode)"], ["Hold R", "Pose wheel"], ["Q / X", "Place clone / remove clones"], ["1", "Whistle"],
              ["2", "Nameplates"], ["3", "X-ray"], ["4 / 5", "Spectate next / free camera"], ["LMB / RMB", "Hunter: shoot / TPS"],
              ["G", "Like (answer check)"], ["Y", "Vote to skip"], ["T", "Chat"], ["E", "Interact (PLAY)"],
            ].map(([k, v]) => (<Fragment key={k}><b>{k}</b><span>{v}</span></Fragment>))}
          </div>
        </details>
      </div>
    </div>
  );
}

// ================= GAME =================

function GameView({ conn, roomNet, name, color, muted, onToggleMute, onExit }: {
  conn: Conn; roomNet: Net | null; name: string; color: string; muted: boolean; onToggleMute: () => void; onExit: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [poseMenu, setPoseMenu] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [charOpen, setCharOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [touch, setTouch] = useState(false);
  const [icons, setIcons] = useState<Record<string, string>>({});

  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    let alive = true;
    let eng: Engine | null = null;
    (async () => {
      try {
        const netMod = await import("@/game/meccha/net");
        let net: Net;
        if (conn.kind === "room" && roomNet) net = roomNet;
        else if (conn.kind === "p2p") net = await netMod.createP2PNet(conn.code, conn.host);
        else net = netMod.createLocalNet();
        const { Engine } = await import("@/game/meccha/engine");
        if (!alive || !mountRef.current) { if (net.kind === "p2p") net.close(); return; }
        eng = new Engine(mountRef.current, net, { name, color, muted, defaultBots: net.kind === "local" ? 3 : 0, onHud: setHud });
        eng.onPoseMenu = (open) => setPoseMenu(open);
        eng.onInteract = () => setSettingsOpen(true);
        eng.onChatKey = () => setChatOpen(true);
        engineRef.current = eng;
        try { setIcons(eng.poseIcons()); } catch { /* אין אייקונים */ }
        if (import.meta.env.DEV) (window as unknown as { __meccha: Engine }).__meccha = eng;
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Failed to start (WebGL or connection).");
      }
    })();
    return () => {
      alive = false;
      eng?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { engineRef.current?.setMuted(muted); }, [muted]);

  const toastId = hud?.toast?.id;
  useEffect(() => {
    if (!hud?.toast) return;
    setToast(hud.toast.text);
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toastId]);

  const phase = hud?.phase;
  useEffect(() => {
    if (phase !== "lobby") setSettingsOpen(false);
    if (phase === "countdown") setCharOpen(true);
    if (phase !== "lobby" && phase !== "countdown") setCharOpen(false);
    if (phase === "check" || phase === "countdown") setPoseMenu(false);
  }, [phase]);

  const e = engineRef.current;
  const overlayOpen = settingsOpen || charOpen || chatOpen;
  const hider = !!hud && hud.alive && hud.myRole === "hider" && hud.phase !== "check";
  const hunter = !!hud && hud.myRole === "hunter" && (hud.phase === "hide" || hud.phase === "hunt");
  const phaseTitle = !hud ? "" : {
    lobby: "LOBBY", countdown: "GET READY", hide: hud.myRole === "hunter" ? "WAIT" : "HIDE!", hunt: hud.myRole === "hunter" ? "HUNT!" : "HUNTING TIME", check: "ANSWER CHECK",
  }[hud.phase];

  return (
    <div className="fixed inset-0 bg-black select-none overflow-hidden text-white" dir="ltr" style={{ fontFamily: FONT }}>
      <div ref={mountRef} className="absolute inset-0" />

      {error && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-black/80 p-6">
          <div className="rounded-2xl bg-white text-black p-5 max-w-sm text-center font-bold">
            <p className="mb-3">{error}</p>
            <button onClick={onExit} className="rounded-xl bg-black text-white px-4 py-2">Back</button>
          </div>
        </div>
      )}
      {!hud && !error && <div className="absolute inset-0 grid place-items-center text-2xl font-black" style={{ textShadow: OUTLINE }}>Loading…</div>}

      {hud && (
        <>
          {/* למעלה: שלב + שעון + אייקוני המתחבאים */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
            <div className="text-sm font-black tracking-wide" style={{ textShadow: OUTLINE }}>{phaseTitle}{hud.phase !== "lobby" && ` · ${hud.mapName}`}</div>
            {hud.phase !== "lobby" && (
              <div className={`text-4xl font-black tabular-nums leading-none ${hud.phase === "hunt" && hud.time <= 10 ? "text-[#ff4d4d]" : ""}`} style={{ textShadow: OUTLINE }}>
                {hud.phase === "countdown" ? hud.time : fmt(hud.time)}
              </div>
            )}
            {hud.hiderIcons.length > 0 && (
              <div className="flex gap-1 mt-1.5">
                {hud.hiderIcons.map((h) => (
                  <svg key={h.id} width="18" height="22" viewBox="0 0 18 22" aria-label={h.found ? "found" : "hiding"}>
                    <circle cx="9" cy="5" r="4.2" fill={h.found ? "#ff3b3b" : "#fff"} stroke="#000" strokeWidth="1.6" />
                    <path d="M2.5 21 C2.5 12 15.5 12 15.5 21 Z" fill={h.found ? "#ff3b3b" : "#fff"} stroke="#000" strokeWidth="1.6" />
                  </svg>
                ))}
              </div>
            )}
            {hud.room && hud.room !== hud.mapName && hud.phase !== "lobby" && hud.phase !== "countdown" && <div className="text-xs font-bold mt-1 opacity-90" style={{ textShadow: OUTLINE }}>{hud.room}</div>}
          </div>

          {/* שמאל למעלה: יציאה, קוד, שחקנים */}
          <div className="absolute top-2 left-2 z-20 flex flex-col gap-1.5 items-start">
            <div className="flex gap-1.5">
              <button onClick={onExit} className="hud-btn rounded-xl bg-black/50 px-2.5 py-1.5 text-xs font-bold"><X className="w-4 h-4 inline" /> Leave</button>
              <button onClick={onToggleMute} className="hud-btn rounded-xl bg-black/50 p-1.5" aria-label="Mute">{muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
            </div>
            {hud.code && (
              <button onClick={() => navigator.clipboard?.writeText(hud.code!).catch(() => {})} className="hud-btn rounded-xl bg-black/50 px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1">
                Code: <span className="tracking-widest text-sm text-[#ffd23f]">{hud.code}</span> <Copy className="w-3 h-3" />
              </button>
            )}
            <div className="rounded-xl bg-black/40 px-2 py-1.5 text-[11px] font-bold grid gap-0.5 max-w-[190px]">
              {hud.players.map((p) => (
                <div key={p.id} className={`flex items-center gap-1.5 ${!p.alive ? "opacity-50" : ""}`}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black" style={{ background: p.color }} />
                  <span className="truncate" style={{ color: p.role === "hunter" ? "#ffb703" : undefined }}>{p.name}{p.me ? " (You)" : ""}</span>
                  {p.host && <span className="text-[#ffd23f]">★</span>}
                  {p.onPad && !p.bot && <span className="text-[#ff4d4d]">HUNTER</span>}
                  {p.likes > 0 && <span className="ml-auto opacity-80">👍{p.likes}</span>}
                </div>
              ))}
            </div>
            {!hud.connected && <div className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold">Disconnected</div>}
          </div>

          {/* ימין למעלה: נקודות ומצבים */}
          <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1 text-xs font-bold pointer-events-none" style={{ textShadow: OUTLINE }}>
            {hud.settings.missed && hud.myRole === "hider" && (hud.phase === "hunt" || hud.phase === "hide") && <div className="text-base">Missed Points: {hud.pts}</div>}
            {hunter && hud.settings.ammoLimit && <div className="text-lg">Ammo: {hud.ammo}</div>}
            {hud.likes > 0 && <div>👍 {hud.likes}</div>}
            {hud.attached && <div className="text-[#8ef56b]">Sticking to wall · Shift to leave</div>}
            {hud.crouch && <div>Crouching</div>}
            {hud.clones > 0 && <div>Clones: {hud.clones}/2</div>}
            {hud.xray && <div className="text-[#4cc9f0]">X-RAY</div>}
            {!hud.nameplates && <div>Nameplates OFF</div>}
            {hud.frozen && hider && hud.phase === "hunt" && <div className="text-[#8ef56b]">Still</div>}
          </div>

          {/* מצב לובי */}
          {hud.phase === "lobby" && !overlayOpen && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
              {hud.nearPlay ? (
                <div className="rounded-2xl bg-black/60 px-4 py-2 text-lg font-black pointer-events-auto cursor-pointer" onClick={() => setSettingsOpen(true)}>
                  <Key k="E" /> {hud.isHost ? "Game Settings / Start" : "Game Settings"}
                </div>
              ) : (
                <div className="text-sm font-bold text-center" style={{ textShadow: OUTLINE }}>
                  Walk to <b className="text-[#ffd23f]">PLAY</b> and press <Key k="E" /> · Stand on the red <b className="text-[#ff4d4d]">HUNTER</b> pad to be a hunter
                </div>
              )}
              {hud.onPad && <div className="text-xl font-black text-[#ff4d4d]" style={{ textShadow: OUTLINE }}>You will be a HUNTER</div>}
              <div className="flex gap-2 pointer-events-auto">
                <button onClick={() => setSettingsOpen(true)} className="rounded-xl bg-[#ffd23f] text-black px-3 py-1.5 text-sm font-black border-2 border-black">Settings</button>
                <button onClick={() => setCharOpen(true)} className="rounded-xl bg-white text-black px-3 py-1.5 text-sm font-black border-2 border-black">Body / Size</button>
                {hud.isHost && <button onClick={() => e?.startCountdown()} className="rounded-xl bg-[#8ef56b] text-black px-4 py-1.5 text-sm font-black border-2 border-black">Start</button>}
              </div>
            </div>
          )}

          {hud.phase === "hide" && hud.myRole === "hunter" && (
            <Banner>The hunters are locked in until the hiding time ends</Banner>
          )}
          {hud.spectating !== null && hud.phase !== "check" && (
            <Banner>{hud.spectating ? `Spectating ${hud.spectating}` : "Free camera"} · 4 next · 5 free camera</Banner>
          )}

          {/* צייד: כוונת */}
          {hunter && hud.alive && !hud.paintMode && (
            <div className="absolute inset-0 z-10 pointer-events-none grid place-items-center">
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="11" fill="none" stroke="#fff" strokeWidth="2.4" />
                <circle cx="22" cy="22" r="11" fill="none" stroke="#000" strokeWidth="0.8" />
                <circle cx="22" cy="22" r="2" fill="#fff" stroke="#000" strokeWidth="0.6" />
              </svg>
              {hud.tps && <div className="absolute top-[58%] text-xs font-bold" style={{ textShadow: OUTLINE }}>TPS</div>}
            </div>
          )}
          {hud.phase === "check" && !overlayOpen && (
            <div className="absolute inset-0 z-10 pointer-events-none grid place-items-center">
              <div className="w-2 h-2 rounded-full bg-white border border-black" />
            </div>
          )}

          {/* בדיקת תשובות */}
          {hud.phase === "check" && <CheckPanel hud={hud} onLike={() => e?.giveLike()} />}

          {/* מגע: ביטול נעילה */}
          {hud.locked && !hud.paintMode && hud.phase !== "check" && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 text-[11px] font-bold opacity-80" style={{ textShadow: OUTLINE }}>Esc to release the mouse</div>
          )}

          {/* מקשים */}
          {!touch && !hud.paintMode && hud.phase !== "check" && (
            <div className="absolute bottom-2 right-2 z-10 text-[11px] font-bold grid gap-0.5 text-right pointer-events-none" style={{ textShadow: OUTLINE }}>
              {hider && <><span><Key k="F" /> Paint</span><span><Key k="R" /> Pose</span><span><Key k="Q" /> Clone <Key k="X" /> Remove</span><span><Key k="1" /> Whistle</span></>}
              {hunter && <><span><Key k="LMB" /> Shoot</span><span><Key k="RMB" /> TPS</span></>}
              {(hud.phase === "hide") && <span><Key k="Y" /> Skip ({hud.votes.have}/{hud.votes.need})</span>}
              <span><Key k="T" /> Chat</span>
            </div>
          )}

          {hud.paintMode && <PaintPanel hud={hud} engine={e} touch={touch} />}
          {poseMenu && <PoseWheel icons={icons} current={hud.pose} onPick={(p) => e?.setPose(p)} onClose={() => setPoseMenu(false)} touch={touch} />}
          {settingsOpen && <SettingsPanel hud={hud} engine={e} onClose={() => setSettingsOpen(false)} />}
          {charOpen && <CharPanel hud={hud} engine={e} onClose={() => setCharOpen(false)} />}

          {/* צ'אט */}
          <div className="absolute left-2 bottom-2 z-20 w-[min(320px,60vw)] grid gap-0.5 text-[12px] font-bold">
            {hud.chat.filter((c) => chatOpen || Date.now() - c.t < 12000).map((c) => (
              <div key={c.id} className="rounded bg-black/40 px-1.5 py-0.5 break-words">
                {c.name && <span style={{ color: c.color }}>{c.name}: </span>}<span className={c.name ? "" : "opacity-70"}>{c.m}</span>
              </div>
            ))}
            {chatOpen && <ChatInput onSend={(m) => e?.sendChat(m)} onClose={() => setChatOpen(false)} />}
          </div>

          {toast && <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 rounded-2xl bg-black/70 px-4 py-2 text-lg font-black">{toast}</div>}

          {touch && <TouchControls hud={hud} engine={e} onPose={() => setPoseMenu((v) => !v)} onChat={() => setChatOpen(true)} />}
        </>
      )}
    </div>
  );
}

function Key({ k }: { k: string }) {
  return <span className="inline-block min-w-[20px] px-1 rounded-md bg-white text-black text-center border-b-[3px] border-black/60 font-black text-[11px] leading-[18px]" style={{ textShadow: "none" }}>{k}</span>;
}

function Banner({ children }: { children: React.ReactNode }) {
  return <div className="absolute top-[108px] left-1/2 -translate-x-1/2 z-20 rounded-xl bg-black/55 px-3 py-1.5 text-sm font-bold text-center pointer-events-none">{children}</div>;
}

function Panel({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/40 p-3" onPointerDown={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className={`w-full ${wide ? "max-w-lg" : "max-w-sm"} max-h-[92vh] overflow-auto rounded-3xl bg-white text-black border-[3px] border-black shadow-[0_6px_0_#000] p-4`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black">{title}</h2>
          <button onClick={onClose} className="rounded-full bg-black text-white p-1" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Opt<T extends string | number | boolean>({ label, value, options, onChange, disabled }: {
  label: string; value: T; options: { v: T; n: string }[]; onChange: (v: T) => void; disabled?: boolean;
}) {
  const i = Math.max(0, options.findIndex((o) => o.v === value));
  const step = (d: number) => onChange(options[(i + d + options.length) % options.length].v);
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-black/10">
      <span className="text-sm font-bold">{label}</span>
      <div className="flex items-center gap-1">
        <button disabled={disabled} onClick={() => step(-1)} className="w-7 h-7 rounded-lg bg-black text-white font-black disabled:opacity-30">‹</button>
        <span className="min-w-[128px] text-center text-sm font-black truncate">{options[i]?.n}</span>
        <button disabled={disabled} onClick={() => step(1)} className="w-7 h-7 rounded-lg bg-black text-white font-black disabled:opacity-30">›</button>
      </div>
    </div>
  );
}

const secs = (list: number[]) => list.map((v) => ({ v, n: v >= 60 ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}` : `${v}s` }));
const nums = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => ({ v: a + i, n: String(a + i) }));
const onOff = [{ v: true, n: "ON" }, { v: false, n: "OFF" }];

function SettingsPanel({ hud, engine, onClose }: { hud: HudState; engine: Engine | null; onClose: () => void }) {
  const s = hud.settings;
  const dis = !hud.isHost;
  const set = (p: Partial<Settings>) => engine?.setSettings(p);
  return (
    <Panel title="Game Settings" onClose={onClose} wide>
      {dis && <p className="text-xs font-bold mb-2 text-black/60">Only the host can change the settings.</p>}
      <Opt label="Map" value={s.map} disabled={dis} options={MAP_LIST.map((m) => ({ v: m.id, n: m.name }))} onChange={(v) => set({ map: v })} />
      <Opt label="Mode" value={s.mode} disabled={dis} options={MODES.map((m) => ({ v: m.id, n: m.name }))} onChange={(v) => set({ mode: v })} />
      <Opt label="Hiding Time" value={s.hideTime} disabled={dis} options={secs([30, 45, 60, 75, 90, 120, 150, 180, 240, 300])} onChange={(v) => set({ hideTime: v })} />
      <Opt label="Hunting Time" value={s.huntTime} disabled={dis} options={secs([60, 90, 120, 180, 240, 300, 420, 600])} onChange={(v) => set({ huntTime: v })} />
      <Opt label="Answer Check Time" value={s.checkTime} disabled={dis} options={secs([10, 20, 30, 45, 60, 90])} onChange={(v) => set({ checkTime: v })} />
      <Opt label="Hunters" value={s.hunters} disabled={dis || s.mode === "double"} options={nums(1, 4)} onChange={(v) => set({ hunters: v })} />
      <Opt label="Ammo Limit" value={s.ammoLimit} disabled={dis} options={onOff} onChange={(v) => set({ ammoLimit: v })} />
      {s.ammoLimit && <Opt label="Ammo" value={s.ammo} disabled={dis} options={nums(1, 20)} onChange={(v) => set({ ammo: v })} />}
      <Opt label="Forced Whistle" value={s.whistle} disabled={dis} options={[{ v: 0, n: "OFF" }, ...secs([15, 30, 45, 60, 90, 120])]} onChange={(v) => set({ whistle: v })} />
      <Opt label="Missed Points" value={s.missed} disabled={dis} options={onOff} onChange={(v) => set({ missed: v })} />
      <Opt label="Allow Petit" value={s.allowPetit} disabled={dis} options={onOff} onChange={(v) => set({ allowPetit: v })} />
      <Opt label="Bots" value={s.bots} disabled={dis} options={nums(0, 8)} onChange={(v) => set({ bots: v })} />
      <Opt label="Bot Difficulty" value={s.difficulty} disabled={dis} options={[{ v: 0 as const, n: "Easy" }, { v: 1 as const, n: "Normal" }, { v: 2 as const, n: "Hard" }]} onChange={(v) => set({ difficulty: v })} />
      {hud.isHost && (
        <button onClick={() => { engine?.startCountdown(); onClose(); }} className="mt-3 w-full rounded-2xl bg-[#8ef56b] border-[3px] border-black shadow-[0_4px_0_#000] py-3 text-xl font-black">
          Start
        </button>
      )}
    </Panel>
  );
}

function CharPanel({ hud, engine, onClose }: { hud: HudState; engine: Engine | null; onClose: () => void }) {
  return (
    <Panel title={hud.phase === "countdown" ? `Starting in ${hud.time}` : "Body / Size"} onClose={onClose}>
      <p className="text-sm font-black mb-1.5">Body Type</p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {BODY_LIST.map((b) => (
          <button key={b.id} onClick={() => engine?.setMyBody(b.id)}
            className={`rounded-xl border-[3px] py-2 font-black ${hud.bodyType === b.id ? "border-black bg-[#ffd23f]" : "border-black/20"}`}>{b.name}</button>
        ))}
      </div>
      <p className="text-sm font-black mb-1.5">Size</p>
      <div className="grid grid-cols-5 gap-1.5">
        {SIZE_LIST.map((z) => {
          const off = z.id === "petit" && !hud.settings.allowPetit;
          return (
            <button key={z.id} disabled={off} onClick={() => engine?.setMySize(z.id)}
              className={`rounded-xl border-[3px] py-2 text-xs font-black disabled:opacity-30 ${hud.size === z.id ? "border-black bg-[#4cc9f0]" : "border-black/20"}`}>{z.name}</button>
          );
        })}
      </div>
      <button onClick={onClose} className="mt-4 w-full rounded-2xl bg-black text-white py-2.5 font-black">OK</button>
    </Panel>
  );
}

function CheckPanel({ hud, onLike }: { hud: HudState; onLike: () => void }) {
  const res = hud.results ?? [];
  const winText = hud.win === "hiders" ? "HIDERS WIN" : hud.win === "hunters" ? "HUNTERS WIN" : res.find((r) => r.id === hud.win)?.n ? `${res.find((r) => r.id === hud.win)!.n} WINS` : "";
  return (
    <>
      <div className="absolute top-[92px] left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none">
        <div className="text-3xl font-black text-[#ffd23f]" style={{ textShadow: OUTLINE }}>{winText}</div>
        <div className="text-xs font-bold" style={{ textShadow: OUTLINE }}>
          <span className="text-[#ff5a5a]">■ Red</span> = not found · <span className="text-[#5a8dff]">■ Blue</span> = found
        </div>
      </div>
      <div className="absolute right-2 top-24 z-20 w-56 rounded-2xl bg-black/55 p-2 text-xs font-bold grid gap-0.5">
        <div className="text-center font-black mb-0.5">{hud.settings.mode === "double" ? "Finds" : hud.settings.missed ? "Missed Points" : "Results"}</div>
        {res.map((r, i) => (
          <div key={r.id} className="flex items-center gap-1.5">
            <span className="w-4 opacity-70">{i + 1}</span>
            <span className="w-2.5 h-2.5 rounded-full border border-black" style={{ background: r.c }} />
            <span className="truncate" style={{ color: r.r === "hunter" ? "#ffb703" : undefined }}>{r.n}</span>
            {r.r === "hider" && hud.settings.mode !== "double" && <span className={r.found ? "text-[#5a8dff]" : "text-[#ff5a5a]"}>{r.found ? "found" : "safe"}</span>}
            <span className="ml-auto tabular-nums">{r.p}</span>
          </div>
        ))}
      </div>
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5">
        {hud.likeTarget && !hud.likedThisRound && (
          <button onClick={onLike} className="rounded-2xl bg-black/60 px-4 py-2 text-lg font-black"><Key k="G" /> 👍 {hud.likeTarget}</button>
        )}
        {hud.likedThisRound && <div className="text-sm font-bold" style={{ textShadow: OUTLINE }}>👍 Sent</div>}
        <div className="text-xs font-bold" style={{ textShadow: OUTLINE }}>
          <Key k="Y" /> Skip ({hud.votes.have}/{hud.votes.need}) · WASD / E / Q free camera
        </div>
      </div>
    </>
  );
}

function ChatInput({ onSend, onClose }: { onSend: (m: string) => void; onClose: () => void }) {
  const [v, setV] = useState("");
  return (
    <form className="flex gap-1 mt-0.5" onSubmit={(ev) => { ev.preventDefault(); if (v.trim()) onSend(v); setV(""); onClose(); }}>
      <input id="meccha-chat" autoFocus value={v} maxLength={120} onChange={(ev) => setV(ev.target.value)}
        onKeyDown={(ev) => { if (ev.key === "Escape") onClose(); ev.stopPropagation(); }} onBlur={() => { if (!v) onClose(); }}
        className="flex-1 min-w-0 rounded-lg bg-black/70 border border-white/40 px-2 py-1 text-white outline-none" placeholder="Chat" />
      <button className="rounded-lg bg-white text-black px-2" aria-label="Send"><Send className="w-4 h-4" /></button>
    </form>
  );
}

// ---------- גלגל תנוחות ----------

function PoseWheel({ icons, current, onPick, onClose, touch }: { icons: Record<string, string>; current: PoseId; onPick: (p: PoseId) => void; onClose: () => void; touch: boolean }) {
  const [page, setPage] = useState(POSE_PAGES[1].includes(current) ? 1 : 0);
  const list = POSE_PAGES[page];
  const R = 128;
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/25" onPointerDown={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className="relative" style={{ width: R * 2 + 90, height: R * 2 + 90 }}>
        <div className="absolute inset-[45px] rounded-full bg-black/45 border-4 border-white/70" />
        {list.map((p, i) => {
          const a = (i / list.length) * Math.PI * 2 - Math.PI / 2;
          const x = R + 45 + Math.cos(a) * R, y = R + 45 + Math.sin(a) * R;
          const on = current === p;
          return (
            <button key={p} onPointerEnter={() => { if (!touch) onPick(p); }} onClick={() => { onPick(p); if (touch) onClose(); }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-[76px] h-[76px] rounded-full border-4 grid place-items-center overflow-hidden transition ${on ? "bg-[#ffd23f] border-black scale-110" : "bg-white border-black/70"}`}
              style={{ left: x, top: y }} aria-label={POSE_NAME[p]} title={POSE_NAME[p]}>
              {icons[p] ? <img src={icons[p]} alt="" className="w-[70px] h-[70px] pointer-events-none" draggable={false} /> : <span className="text-[10px] font-black text-black">{POSE_NAME[p]}</span>}
            </button>
          );
        })}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-lg font-black" style={{ textShadow: OUTLINE }}>{POSE_NAME[current]}</div>
          <div className="flex gap-1 justify-center mt-1.5">
            {POSE_PAGES.map((_, i) => (
              <button key={i} onClick={() => setPage(i)} className={`w-8 h-8 rounded-full font-black border-2 border-black ${page === i ? "bg-white text-black" : "bg-black/60"}`}>{i + 1}</button>
            ))}
          </div>
          {!touch && <div className="text-[10px] font-bold mt-1 opacity-80">Hover to choose · release R</div>}
        </div>
      </div>
    </div>
  );
}

// ---------- פאנל צביעה ----------

function hsvToHex(h: number, s: number, v: number) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const to = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, "0");
  return `#${to(f(5))}${to(f(3))}${to(f(1))}`;
}
function hexToHsv(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: max ? d / max : 0, v: max };
}
const rgbOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");

function ColorWheel({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const hsv = useMemo(() => hexToHsv(color), [color]);
  const S = 132;
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const img = g.createImageData(S, S);
    const R = S / 2;
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const dx = x - R, dy = y - R;
        const d = Math.hypot(dx, dy);
        const i = (y * S + x) * 4;
        if (d > R) { img.data[i + 3] = 0; continue; }
        const [r, gg, b] = rgbOf(hsvToHex(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360, d / R, hsv.v));
        img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  }, [hsv.v]);
  function pick(ev: React.PointerEvent<HTMLCanvasElement>) {
    const r = ev.currentTarget.getBoundingClientRect();
    const dx = ((ev.clientX - r.left) / r.width) * S - S / 2;
    const dy = ((ev.clientY - r.top) / r.height) * S - S / 2;
    const s = Math.min(1, Math.hypot(dx, dy) / (S / 2));
    onChange(hsvToHex(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360, s, hsv.v || 1));
  }
  const mx = 50 + Math.cos((hsv.h * Math.PI) / 180) * hsv.s * 50;
  const my = 50 + Math.sin((hsv.h * Math.PI) / 180) * hsv.s * 50;
  return (
    <div className="relative w-[112px] h-[112px] shrink-0">
      <canvas ref={ref} width={S} height={S} className="w-full h-full rounded-full cursor-crosshair touch-none"
        onPointerDown={(ev) => { ev.currentTarget.setPointerCapture(ev.pointerId); pick(ev); }}
        onPointerMove={(ev) => { if (ev.buttons) pick(ev); }} />
      <span className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow pointer-events-none -translate-x-1/2 -translate-y-1/2" style={{ left: `${mx}%`, top: `${my}%`, background: color }} />
    </div>
  );
}

function Slider({ id, label, value, min, max, step, onChange, bg }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; bg?: string }) {
  return (
    <label htmlFor={id} className="grid grid-cols-[62px_1fr_34px] items-center gap-1.5 text-[11px] font-bold">
      <span>{label}</span>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(ev) => onChange(Number(ev.target.value))}
        className="w-full h-2 rounded-full appearance-none accent-black" style={{ background: bg ?? "#ddd" }} />
      <span className="tabular-nums text-right">{step < 1 ? value.toFixed(2) : Math.round(value)}</span>
    </label>
  );
}

function PaintPanel({ hud, engine, touch }: { hud: HudState; engine: Engine | null; touch: boolean }) {
  const [tab, setTab] = useState<"rgb" | "hsv">("rgb");
  const [hexText, setHexText] = useState("");
  const col = hud.pickPreview && hud.picking ? hud.pickPreview : hud.color;
  const hsv = hexToHsv(hud.color);
  const [r, g, b] = rgbOf(hud.color);
  const aHex = hex2(hud.alpha * 255);
  useEffect(() => { setHexText(`${hud.color.slice(1)}${aHex}`.toUpperCase()); }, [hud.color, aHex]);
  const set = (color: string) => engine?.setBrush({ color });
  const applyHex = (t: string) => {
    const v = t.replace(/[^0-9a-f]/gi, "");
    if (v.length === 6 || v.length === 8) engine?.setBrush({ color: `#${v.slice(0, 6).toLowerCase()}`, ...(v.length === 8 ? { alpha: parseInt(v.slice(6), 16) / 255 } : {}) });
  };
  return (
    <div className={`absolute z-20 left-2 ${touch ? "top-2 max-h-[calc(100dvh-16px)]" : "top-28 max-h-[calc(100dvh-130px)]"} w-[248px] overflow-auto rounded-2xl bg-white/95 text-black border-[3px] border-black p-2.5 grid gap-2 text-[11px]`}>
      <div className="flex items-center justify-between">
        <span className="font-black text-sm">PAINT</span>
        <button onClick={() => engine?.togglePaint()} className="rounded-lg bg-black text-white px-2 py-0.5 font-black">F Close</button>
      </div>
      <div className="flex items-center gap-2">
        <ColorWheel color={hud.color} onChange={set} />
        <div className="grid gap-1.5 flex-1">
          <div className="h-10 rounded-xl border-2 border-black" style={{ background: col, opacity: Math.max(0.15, hud.alpha) }} />
          <button onPointerDown={() => engine?.setPicking(!hud.picking)}
            className={`rounded-xl border-2 border-black py-1 font-black inline-flex items-center justify-center gap-1 ${hud.picking ? "bg-[#ffd23f]" : "bg-white"}`}>
            <Pipette className="w-3.5 h-3.5" /> {touch ? "Pick" : "Space"}
          </button>
          <button onClick={() => engine?.clearPaint()} className="rounded-xl border-2 border-black py-1 font-black">Reset</button>
        </div>
      </div>
      <div className="flex gap-1">
        {(["rgb", "hsv"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg border-2 border-black font-black py-0.5 ${tab === t ? "bg-black text-white" : ""}`}>{t.toUpperCase()}</button>
        ))}
      </div>
      {tab === "rgb" ? (
        <div className="grid gap-1">
          <Slider id="pr" label="R" value={r} min={0} max={255} step={1} onChange={(v) => set(`#${hex2(v)}${hex2(g)}${hex2(b)}`)} bg={`linear-gradient(90deg,#00${hex2(g)}${hex2(b)},#ff${hex2(g)}${hex2(b)})`} />
          <Slider id="pg" label="G" value={g} min={0} max={255} step={1} onChange={(v) => set(`#${hex2(r)}${hex2(v)}${hex2(b)}`)} bg={`linear-gradient(90deg,#${hex2(r)}00${hex2(b)},#${hex2(r)}ff${hex2(b)})`} />
          <Slider id="pb" label="B" value={b} min={0} max={255} step={1} onChange={(v) => set(`#${hex2(r)}${hex2(g)}${hex2(v)}`)} bg={`linear-gradient(90deg,#${hex2(r)}${hex2(g)}00,#${hex2(r)}${hex2(g)}ff)`} />
        </div>
      ) : (
        <div className="grid gap-1">
          <Slider id="ph" label="H" value={hsv.h} min={0} max={359} step={1} onChange={(v) => set(hsvToHex(v, hsv.s, hsv.v))} bg="linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" />
          <Slider id="ps" label="S" value={hsv.s} min={0} max={1} step={0.01} onChange={(v) => set(hsvToHex(hsv.h, v, hsv.v))} bg={`linear-gradient(90deg,${hsvToHex(hsv.h, 0, hsv.v)},${hsvToHex(hsv.h, 1, hsv.v)})`} />
          <Slider id="pv" label="V" value={hsv.v} min={0} max={1} step={0.01} onChange={(v) => set(hsvToHex(hsv.h, hsv.s, v))} bg={`linear-gradient(90deg,#000,${hsvToHex(hsv.h, hsv.s, 1)})`} />
        </div>
      )}
      <Slider id="pa" label="Alpha" value={hud.alpha} min={0} max={1} step={0.01} onChange={(v) => engine?.setBrush({ alpha: v })} />
      <label className="flex items-center gap-1.5 font-bold">
        <span className="w-[62px]">Hex sRGB</span>
        <span>#</span>
        <input id="phex" value={hexText} maxLength={8} onChange={(ev) => setHexText(ev.target.value.toUpperCase())}
          onKeyDown={(ev) => { ev.stopPropagation(); if (ev.key === "Enter") applyHex(hexText); }} onBlur={() => applyHex(hexText)}
          className="flex-1 min-w-0 rounded-md border-2 border-black px-1 font-mono text-[12px]" />
      </label>
      <Slider id="pm" label="Metallic" value={hud.metal} min={0} max={1} step={0.01} onChange={(v) => engine?.setBrush({ metal: v })} />
      <Slider id="pro" label="Roughness" value={hud.rough} min={0} max={1} step={0.01} onChange={(v) => engine?.setBrush({ rough: v })} />
      <Slider id="pe" label="Emissive" value={hud.emis} min={0} max={1} step={0.01} onChange={(v) => engine?.setBrush({ emis: v })} />
      <Slider id="psz" label="Brush Size" value={hud.brush} min={0.01} max={0.5} step={0.01} onChange={(v) => engine?.setBrushSize(v)} />
      {hud.history.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {hud.history.map((c) => <button key={c} onClick={() => set(c)} className="w-6 h-6 rounded-md border-2 border-black" style={{ background: c }} aria-label={c} />)}
        </div>
      )}
      <div className="flex gap-1">
        <button onClick={() => engine?.setShadow(!hud.shadow)} className={`flex-1 rounded-lg border-2 border-black py-0.5 font-black ${!hud.shadow ? "bg-black text-white" : ""}`}>V Shadow {hud.shadow ? "ON" : "OFF"}</button>
        <button onClick={() => engine?.setXray(!hud.xray)} className={`flex-1 rounded-lg border-2 border-black py-0.5 font-black ${hud.xray ? "bg-[#4cc9f0]" : ""}`}>3 X-ray</button>
      </div>
      {!touch && <div className="text-[10px] font-bold text-black/60 leading-tight">LMB paint · RMB drag = brush size · Alt+LMB / MMB rotate · Wheel zoom · Space+Wheel = history</div>}
    </div>
  );
}

// ---------- מגע ----------

function TouchControls({ hud, engine, onPose, onChat }: { hud: HudState; engine: Engine | null; onPose: () => void; onChat: () => void }) {
  const hider = hud.alive && hud.myRole === "hider" && hud.phase !== "check";
  const hunter = hud.myRole === "hunter" && hud.phase === "hunt" && hud.alive;
  const b = "w-14 h-14 rounded-full bg-white/80 text-black border-[3px] border-black font-black text-xs active:scale-90";
  return (
    <>
      {!hud.paintMode && <Joystick onChange={(x, y) => engine?.setJoystick(x, y)} />}
      <div className="absolute right-3 bottom-4 z-20 grid grid-cols-3 gap-2 items-end">
        {hunter && <button className={`${b} !w-20 !h-20 !bg-[#ff4d4d] col-span-3 justify-self-end`} onPointerDown={() => engine?.fire()}>FIRE</button>}
        {hider && <button className={b} onClick={() => engine?.togglePaint()}>{hud.paintMode ? "Done" : "Paint"}</button>}
        {hider && !hud.paintMode && <button className={b} onClick={onPose}>Pose</button>}
        {hider && !hud.paintMode && <button className={b} onClick={() => engine?.placeClone()}>Clone</button>}
        {hider && !hud.paintMode && <button className={b} onClick={() => engine?.whistle()}>♪</button>}
        {hud.attached && <button className={b} onClick={() => engine?.detach()}>Leave</button>}
        {!hud.paintMode && <button className={`${b} !bg-[#8ef56b]`} onClick={() => engine?.jump()}>Jump</button>}
        {hud.phase === "check" && <button className={b} onClick={() => engine?.giveLike()}>👍</button>}
        {(hud.phase === "hide" || hud.phase === "check") && <button className={b} onClick={() => engine?.voteSkip()}>Skip</button>}
        {hud.spectating !== null && <button className={b} onClick={() => engine?.cycleSpectate()}>Next</button>}
        <button className={b} onClick={onChat}>Chat</button>
      </div>
    </>
  );
}

function Joystick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const base = useRef<HTMLDivElement>(null);
  const id = useRef<number | null>(null);
  const R = 48;
  function move(ev: React.PointerEvent) {
    const r = base.current!.getBoundingClientRect();
    let x = ev.clientX - (r.left + r.width / 2);
    let y = ev.clientY - (r.top + r.height / 2);
    const d = Math.hypot(x, y);
    if (d > R) { x = (x / d) * R; y = (y / d) * R; }
    setKnob({ x, y });
    onChange(x / R, -y / R);
  }
  function end() {
    id.current = null;
    setKnob({ x: 0, y: 0 });
    onChange(0, 0);
  }
  return (
    <div ref={base} className="absolute z-20 left-6 bottom-24 w-32 h-32 rounded-full bg-white/15 border-[3px] border-white/40" style={{ touchAction: "none" }}
      onPointerDown={(ev) => { id.current = ev.pointerId; ev.currentTarget.setPointerCapture(ev.pointerId); move(ev); }}
      onPointerMove={(ev) => { if (id.current === ev.pointerId) move(ev); }}
      onPointerUp={end} onPointerCancel={end}>
      <div className="absolute w-14 h-14 rounded-full bg-white/70 border-2 border-black left-1/2 top-1/2" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
    </div>
  );
}
