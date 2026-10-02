# Map modeling guide — MECCHA CHAMELEON browser clone

You are a senior 3D environment artist + technical artist. You build game maps **entirely in code** with Three.js
(r186) through the project's `Kit` builder. There are no external model/image files: every mesh is procedural and every
colour texture is drawn on a Canvas (`src/game/meccha/textures.ts` + your own texture file). Real photographed HDR
environments ARE available for lighting/reflections (see "Lighting").

The goal is a faithful, **realistic-looking** reconstruction of the real game's map (see `spec/RESEARCH.md` in the
scratchpad — read it first). The real game is a hide-and-seek game where white characters paint themselves to blend into
the environment, so maps are dense with props, surfaces have real texture detail, and objects have believable
real-world proportions. The user's main complaint about the previous version: "the map doesn't look good, the blocks
don't look realistic". Fix that.

## Files you own
- `src/game/meccha/maps/<id>.ts` — your map (keep the exported function name that's already there).
- Optional: `src/game/meccha/maps/tex/<id>.ts` — your own Canvas texture generators (import `makeTex`, `PaintTex` from
  `../../textures`). Put new textures THERE, never edit `textures.ts`.
- Do NOT edit any other file (kit.ts, engine.ts, index.ts, textures.ts, other maps). Other agents are editing other maps
  in parallel. If you need a kit feature that doesn't exist, implement it locally in your map file.
- Do NOT run git. Do NOT start/stop/restart dev servers.

## Coordinate system & scale
- Metres. Y up. Floor at y=0. The player character is **1.7 m tall** (Petit = 0.85 m), radius ~0.3 m.
- Real-world dimensions: doors ≥ 1.2 m wide × 2.3 m tall (the kit's `doorH` is the opening height), corridors ≥ 1.4 m,
  chairs seat 0.45 m, tables 0.75 m, counters 0.9 m, bookshelves 2–2.4 m, ceiling 3–6 m (halls can be taller).
- Map footprint: typically 30–60 m across. `bounds` = walkable rectangle (players are clamped inside).
- Everything is climbable: players can jump into any wall/object and hold Space to climb, then stand on its top. So tops of
  furniture, beams and pipes are valid hiding spots — make them sensible.

## Kit API (src/game/meccha/maps/kit.ts — read it)
- `const k = new Kit(wallH, doorH)`.
- Materials: `k.mat(ptex | null, color, repeat=[1,1], { metalness, roughness, transparent, emissive, emissiveIntensity, bump })`
  — when `ptex` is given a **normal map is auto-generated from the texture's luminance** (bump strength `bump`, default
  0.55; use 0.2–0.4 for smooth painted surfaces, 0.8–1.2 for brick/stone/wood grain, 0 to disable). `k.tex(key, make)`
  caches a texture by key. `k.fit(mat, w, h, unit)` = same material with repeat scaled to the surface size (use it so
  textures keep real-world scale — e.g. bricks ~0.25 m, floor planks ~0.2 m).
- Geometry helpers (y = bottom unless noted): `k.box(w,h,d,x,y,z,mat,{solid,standable,rotY,...})` — boxes smaller than
  4.5 m get **rounded (bevelled) edges automatically**; `k.seat(...)` = standable solid box; `k.cyl`, `k.ball` (y=centre),
  `k.cone`, `k.panel(w,h,x,y,z,mat,rotY)` (flat picture/poster; y = centre), `k.lathe([[r,h],...],x,y,z,mat)` (vases,
  lamps, columns, bottles, toilets…), `k.tube(points,r,mat)` (pipes, rails, cables), `k.extrude(shape,depth,x,y,z,mat)`
  (arches, frames, cut-out standees, signs), `k.instances(geo,mat,[{pos,rotY,scale,color}],{solid})` (many copies in ONE
  draw call — books, tiles, bottles, candies), `k.merged([geos], mat)` (merge pre-positioned geometries of one material),
  `k.add(geo, mat, [x,y,z], opts)` (anything else; y = centre of geometry).
- Structure: `k.floor(x1,x2,z1,z2,mat,unit)`, `k.ceiling(x1,x2,z1,z2,mat,h,unit)`, `k.wallX(z,x1,x2,mat,doors,archMat,h)` /
  `k.wallZ(x,z1,z2,...)` with door openings `[[centre, width], ...]`, `k.doorFrame`, `k.room(name,x1,x2,z1,z2)` (area names
  shown on the HUD — use English), `k.plant(x,z,s)`, `k.collider(minX,maxX,minZ,maxZ,bottom,top,standable)` (invisible
  AABB collider — use it for rotated/round objects whose automatic AABB is wrong, together with `solid:false` on the mesh).
- Collisions: `solid:true` adds the mesh's world AABB as an obstacle (rotated meshes get an oversized AABB → prefer
  explicit `k.collider`). Low solids (≤0.45 m) are stepped over automatically. Anything taller blocks walking but can be
  climbed.
- `k.finish({ id, name, bounds, hunterSpawns, hiderSpawns, lighting, preview })`:
  - `hiderSpawns`: 24 points in an open area where hiders appear when the hide phase starts.
  - `hunterSpawns`: ~9 points where hunters appear when the SEARCH phase starts (hunters wait in the lobby during the hide
    phase — there is NO hunter room and NO gate on maps; don't build them). Put them at the map's natural entrance.
  - `preview`: `{ pos:[x,y,z], look:[x,y,z], fov? }` — a beautiful establishing shot of the map (used for the map picture in
    the lobby). Choose it carefully.
- `Lighting`: `{ sky, hemi:[sky,ground,intensity], sun:{color,int,pos}|null, fog?:[color,near,far], points:[{pos,color,int,dist}],
  exposure?, env?, hdri?, hdriBackground?, envRotation? }`.

## Lighting — this is what makes it look real
- Pick an `hdri` from: apartment, bridge, city, dawn, esplanade, forest, hall, lab, lobby, night, park, sky, studio,
  sunrise, sunset, venice, warehouse, workshop (real CC0 photographed environments; used for image-based lighting and
  reflections). `env` = its intensity (0.2–1.0). For outdoor maps set `hdriBackground` (0–0.6 blur) to use it as the sky.
- The sun (directional) is the only shadow caster (2048 map covering ~54×48 m around the origin) — keep the map centred on
  the origin. Point lights: ≤ 6, no shadows; use them for lamps/fixtures and pair with an emissive fixture mesh.
- Ambient occlusion (GTAO) and ACES tone mapping are applied by the engine. Keep hemi light moderate (0.3–0.9) when an
  HDRI is used — the HDRI provides much of the ambient light. Avoid a flat, evenly-lit look; create light pools, warm/cool
  contrast, darker corners.

## Realism checklist
- Real proportions and real construction: baseboards/skirting, crown moulding, door frames, window frames, wainscoting,
  ceiling beams, light fixtures, outlets/vents, rugs, trims. Furniture built from parts (legs, aprons, tops, drawers with
  handles, cushions), not single boxes.
- Material variety & texture detail: wood grain, stone/marble veining, brick with mortar, tile grout, fabric, metal (with
  metalness 0.8–1 and roughness 0.2–0.5), plastic, glass (transparent). Colour variation and wear/dirt on large surfaces.
  Texture resolution ≤ 512 px; use repeats with real-world scale.
- Silhouettes: round what should be round (lathe/cylinders with 24–32 segments), bevel edges, avoid "Minecraft" blocks
  unless the object is genuinely a box.
- Composition: clusters of props, props against walls, paths through rooms, hiding opportunities of all colours and
  materials (the game is about blending in), clear landmarks per area.
- Performance budget (measured by the shot tool): ≤ 500 draw calls, ≤ 500k triangles, build time ≤ 900 ms in the harness.
  Use `k.instances` / `k.merged` for repeated small items, share materials (create each material once and reuse it).
- Keep text on signs short; no real brand logos (parody signs that the real game has are fine).

## Verify (MANDATORY, iterate until good)
1. Type check: `cd /home/user/compute-quest && npx tsc --noEmit -p . 2>&1 | grep "maps/<id>\|maps/tex/<id>"` must print nothing.
2. Render: `node /tmp/claude-0/-home-user-compute-quest/bc972495-63a4-5c7b-a8d6-ba8b8a5729b9/scratchpad/tools/shot.mjs <id>`
   (takes ~1–3 min; run with a Bash timeout of 600000). It prints stats JSON (meshes, tris, obstacles, `free`/`reach`
   navigation cells — **reach must equal free**, i.e. everything is reachable from the hunter spawn; `hiderSpawnsFree` must
   be 24/24), render stats (draw calls) and any console errors, and saves PNGs into
   `scratchpad/shots/<id>/`: `preview.png`, `overview.png` (cut-away plan view: everything above 3 m hidden) and
   `eye-0..7.png` (eye-level views). For specific angles:
   `node .../shot.mjs <id> --views="x,y,z,yaw,pitch;x,y,z,yaw,pitch"` → `custom-N.png`
   (camera looks along (-sin(yaw), -sin(pitch), -cos(yaw)); pitch>0 looks down).
3. LOOK at the PNGs with the Read tool. Critique them like an art director against RESEARCH.md and the realism checklist,
   fix, and re-render. Do at least 3 improvement passes. The rendering uses a software GPU, so it is slow — be patient.
   The harness server at http://127.0.0.1:5180 is shared; if the page fails to load, wait 20 s and retry.

## Report
When done, reply with: what you built (areas + key props), the stats line, and the final screenshot paths.

## Real paintings (MANDATORY for any framed painting)
Never draw fake or "ugly" procedural paintings. Use the real public-domain masterpieces in
`src/game/meccha/paintings.ts`: `PAINTINGS` (22 works by Van Gogh, Leonardo da Vinci, Vermeer and Monet, each with
`title`, `artist`, `w`, `h`), `realPaintingTex(i)` (a PaintTex for painting i) and `pickPainting(aspect, usedSet, seed)`
(returns the index of the unused painting whose aspect ratio is closest to the frame's). Build one material per painting
(`k.mat(realPaintingTex(i), "#fff", [1,1], { roughness: 0.6, bump: 0 })`, cached in a Map) and cover-crop the image
into the frame through UVs. The images are preloaded before maps are built.

## Real references
Read `ref/REFERENCE.md` and study the real screenshots listed there for your map before building.

## Engine effects you can use
- Flowing water: after creating a water material `const waterM = k.mat(...)`, set `waterM.m.userData.flow = [du, dv]` (UV units
  per second, e.g. [0.004, 0.035]). The engine scrolls its texture and normal map, and plays a water ambience + drips
  whose volume depends on the distance to the water meshes. Use low roughness (0.05–0.15) so it reflects.
- Reflections: the engine bakes a reflection probe of the map itself (indoor maps), so glossy materials (roughness
  0.1–0.35, metals, glass, polished tile/marble/wood) show real reflections of the room. Use them generously for floors,
  counters, metal fixtures.
- Flickering lamps: the engine makes some point lights flicker automatically.
- Maps must build fast: every texture generator under 60 ms; temp canvases must use
  `getContext("2d", { willReadFrequently: true })`; never `arc(..., 0, 7)` — use Math.PI * 2.
