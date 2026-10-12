(() => {
  const bc = new BroadcastChannel("fake-room");
  const me = Math.random().toString(36).slice(2, 10);
  let myPres = {};
  const peers = new Map(); // id -> {presence, t}
  const topicFns = new Map();
  const peerFns = new Set();
  let snap = [];
  function rebuild() {
    const list = [{ peer: me, by: null, isMe: true, sameTab: true, kind: "viewer", guest: false, presence: Object.freeze({ ...myPres }), updatedAt: Date.now() }];
    for (const [id, v] of peers) list.push({ peer: id, by: null, isMe: false, sameTab: false, kind: "viewer", guest: false, presence: Object.freeze(v.presence), updatedAt: v.t });
    snap = Object.freeze(list);
    const ch = { peers: snap, joined: [], left: [], updated: [] };
    setTimeout(() => peerFns.forEach((f) => f(ch)), 0);
  }
  bc.onmessage = (ev) => {
    const m = ev.data;
    if (m.k === "pres") {
      const had = peers.has(m.from);
      peers.set(m.from, { presence: m.p, t: Date.now() });
      if (!had) bc.postMessage({ k: "pres", from: me, p: myPres });
      rebuild();
    } else if (m.k === "bye") { peers.delete(m.from); rebuild(); }
    else if (m.k === "ev") topicFns.get(m.topic)?.forEach((f) => f({ topic: m.topic, data: m.data, peer: m.from, by: null, isMe: false, sameTab: false, kind: "viewer", guest: false }));
  };
  window.addEventListener("beforeunload", () => bc.postMessage({ k: "bye", from: me }));
  const room = {
    emit(topic, data) { bc.postMessage({ k: "ev", topic, data, from: me }); return Promise.resolve(); },
    on(topic, h) { if (!topicFns.has(topic)) topicFns.set(topic, new Set()); topicFns.get(topic).add(h); return () => topicFns.get(topic).delete(h); },
    presence(patch) { myPres = { ...myPres, ...patch }; for (const k of Object.keys(patch)) if (patch[k] === null) delete myPres[k]; bc.postMessage({ k: "pres", from: me, p: myPres }); rebuild(); return Promise.resolve(); },
    peers() { return snap; },
    onPeers(h) { peerFns.add(h); setTimeout(() => h({ peers: snap, joined: snap, left: [], updated: [] }), 0); return () => peerFns.delete(h); },
    connected() { return true; },
  };
  rebuild();
  bc.postMessage({ k: "pres", from: me, p: myPres });
  window.claude = { use: (n) => Promise.resolve(n === "room" ? room : null) };
})();
