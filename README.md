# MECCHA CHAMELEON — browser remake by Tom Kodner

A fan-made remake of **MECCHA CHAMELEON** (multiplayer hide-and-seek where chameleons paint themselves to blend in and hunters hunt them), built with React + Three.js.

- Play: open `release/meccha-chameleon.html` in a browser, or run `release/MecchaChameleon.exe` on Windows (it has an in-game **Update** button that downloads the newest `release/meccha-chameleon.html` from this branch).
- Source: `src/game/meccha/` (engine, maps, characters, networking, i18n) and `src/components/MecchaGame.tsx` / `MecchaMenu.tsx` (UI). Windows launcher source: `release/launcher/`.
- Features: Create/Find servers (online multiplayer), bots, 23 maps, paint mode with 3D eyedropper, poses and clones, paint shotgun, Missed-Spot points, 13 languages (incl. full RTL for Hebrew/Arabic), phone controls, real-time lights and shadows.

---

# Development tools

- `dev/preview-tmp/` — Vite configs and pages used to build the single-file game (`vite.config.mjs`), run the full app (`vite.app.mjs`, port 5181) and the map test harness (`vite.harness.mjs`, port 5180).
- `dev/tools/` — map screenshot/profiling tools (`shot.mjs`, `prof.mjs`), thumbnail generator, translation scanners, gameplay video recorder, room transport fake for multiplayer tests.
- `dev/qa/` — automated QA scripts: 3-client multiplayer, offline bots, menu/in-game button audits, phone controls, RTL.
- `dev/spec/` — modelling guide, game research notes and reference descriptions used to build the maps.
