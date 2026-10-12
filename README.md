# 🦎 MECCHA CHAMELEON — Browser Remake by Tom Kodner

> A complete, fan-made, browser-based remake of **MECCHA CHAMELEON** — the online multiplayer hide-and-seek game where the
> hiders are white chameleons that **paint their own bodies** to melt into the world, and the hunters roam the map with a
> **paint shotgun** trying to spot them. Everything in this repository — the engine, the 3D maps, the characters, the
> networking, the menus, the translations, the phone controls and the Windows app — was designed and built by
> **Tom Kodner**.

---

## 📑 Table of contents

1. [What is this?](#-what-is-this)
2. [Play it right now](#-play-it-right-now)
3. [How the game works](#-how-the-game-works)
4. [Controls (PC)](#-controls-pc)
5. [Controls (phone / tablet)](#-controls-phone--tablet)
6. [Game modes](#-game-modes)
7. [Configure Map — every host setting](#-configure-map--every-host-setting)
8. [The chameleon: painting, poses, clones, body types](#-the-chameleon-painting-poses-clones-body-types)
9. [The hunter: paint shotgun and searching](#-the-hunter-paint-shotgun-and-searching)
10. [Missed-Spot Ranking and points](#-missed-spot-ranking-and-points)
11. [All 23 maps (+ the lobby)](#-all-maps--the-lobby)
12. [Menus and screens](#-menus-and-screens)
13. [Settings](#-settings)
14. [Multiplayer and servers](#-multiplayer-and-servers)
15. [Bots](#-bots)
16. [Graphics and rendering technology](#-graphics-and-rendering-technology)
17. [Sound](#-sound)
18. [Languages (13) and right-to-left support](#-languages-13-and-right-to-left-support)
19. [The Windows app (EXE) and the Update button](#-the-windows-app-exe-and-the-update-button)
20. [Building from source](#-building-from-source)
21. [Developer tools and automated QA](#-developer-tools-and-automated-qa)
22. [Project structure — every source file](#-project-structure--every-source-file)
23. [How it was built — development history](#-how-it-was-built--development-history)
24. [Full commit log](#-full-commit-log)
25. [Known limitations and ideas for the future](#-known-limitations-and-ideas-for-the-future)
26. [FAQ](#-faq)
27. [Credits and legal](#-credits-and-legal)

---

## 🎮 What is this?

MECCHA CHAMELEON is a PC party game: a group of players splits into **hunters** and **chameleons (hiders)**. During the
hide phase the chameleons run into the map, pick a spot, strike a pose and **paint themselves** — with a colour wheel,
RGB/HSV sliders, a 3D eyedropper that samples real surface colours, and metallic / roughness / emissive material
sliders — until they are indistinguishable from the wall, sofa, shelf or floor they are hugging. Then the hunters are
released into the map and have a limited time to find and shoot them. Afterwards everybody sees an **answer check**:
where every chameleon was hiding, who was found and who survived.

This project rebuilds that whole experience so it runs **in any modern web browser** (and as a Windows app), with:

- 🌍 **23 full 3D maps** plus a gallery lobby, all modelled entirely in code (no external 3D model files for the maps),
  with real-time lights, shadows, reflections, flowing water, flickering lamps and real famous paintings on the walls.
- 🧑‍🤝‍🧑 **Online multiplayer** with named servers, passwords, player limits, host migration and live server lists.
- 🤖 **Bots** that hide, paint themselves to match the surface they choose, and hunt.
- 🎨 A full **3D body-painting system** with brush size, colour history, eyedropper, metallic, roughness and glow paint.
- 🕺 **36 poses**, clones (decoys of yourself), Normal / Petit sizes and three body types (Default, Cube, Plump).
- 🔫 The hunter's **paint shotgun** with pump animation, muzzle flash, rainbow paint trails and paint splatter.
- 🗣️ **13 languages**, including complete right-to-left layout for Hebrew and Arabic.
- 📱 **Phone and tablet controls** (virtual joystick, hold-to-climb, run, crouch, paint, pose, clone, fire, chat).
- 💻 A **Windows EXE** launcher with an in-game **Update** button.

---

## ▶️ Play it right now

| Way | How |
|---|---|
| **Single HTML file** | Download `release/meccha-chameleon.html` and open it in Chrome, Edge or Firefox. That one file is the entire game. |
| **Windows app** | Download `release/MecchaChameleon.exe` and double-click it. A small console window opens and the game starts in your browser. Keep the console window open while you play. |
| **From source** | See [Building from source](#-building-from-source). |

Recommended: a PC with a dedicated or modern integrated GPU, a mouse and keyboard. The game also runs on phones in
landscape orientation.

---

## 🕹️ How the game works

A match is a loop of rounds. Each round goes through these phases:

1. **Lobby** — everyone spawns in the gallery lobby. The lobby has a canvas easel labelled **PLAY**: the host walks up to
   it and presses **E** to open **Configure Map**. A red round **HUNTER** pad sits in the middle of the room — players who
   stand on it get priority to become hunters. Every map hangs on the lobby walls as a framed picture with a brass plate.
2. **Countdown** — when the host presses **Start Game**, a short countdown runs and the map is chosen (or picked at random
   from the pool).
3. **Hide phase ("Until Search Starts")** — chameleons are teleported into the map. They run, climb walls, choose a spot,
   pick a pose (hold **R**), place up to two clones (**Q**) and paint themselves (**F**). Hunters wait in the lobby and
   cannot see the map yet.
4. **Search phase ("Search Time")** — hunters are released at the map entrance with their paint shotguns. Every shot that
   hits a chameleon finds it. Chameleons who are found become spectators (or, in Infection mode, hunters). Hiders earn
   **Missed-Spot points** while hunters look at them without finding them. A forced **taunt** (whistle) can play at a set
   interval so hunters get a sound clue.
5. **Answer Check** — the round ends. The camera shows every hiding place: red glow = not found, blue glow = found.
   Players can **like** (👍) a great hiding spot. Everyone can vote to **skip**.
6. Back to the lobby for the next round.

**Who wins?** Chameleons win if at least one of them survives until the timer runs out; hunters win if they find everyone.

---

## ⌨️ Controls (PC)

| Key | Action |
|---|---|
| **W A S D** | Move |
| **Mouse** | Look around (click the game to lock the mouse) |
| **Shift** | Sprint / detach from a wall while climbing |
| **Space** | Jump. Jump into a wall and **hold Space** to climb walls and ceilings |
| **Ctrl** | Crouch / climb down |
| **F** | Paint Mode (chameleons only — hunters cannot paint) |
| **Space** (in Paint Mode, hold) | 3D Eyedropper — aim at any surface to sample its colour and material |
| **Left mouse** (Paint Mode) | Paint on your own body |
| **Right mouse drag** (Paint Mode) | Brush size |
| **Middle mouse drag** (Paint Mode) | Rotate the paint camera |
| **Mouse wheel** (Paint Mode) | Zoom / switch between saved colours |
| **V** (Paint Mode) | Toggle shadow preview |
| **R** (hold) | Pose wheel — release on a pose |
| **Q** | Place a clone of yourself (up to two) |
| **X** | Remove your clones |
| **1** | Taunt (whistle) |
| **2** | Toggle nameplate display |
| **3** | Toggle X-ray rendering |
| **5** | Switch to free camera (**4** = move the free camera) |
| **Right mouse** (hunter) | First / third person (if the host allows Hunter TPS) |
| **Left mouse** (hunter) | Fire the paint shotgun |
| **G** | Like a great hiding spot (answer check) |
| **Y** | Vote to skip |
| **T** | Chat |
| **Tab** | Missed-Spot Ranking |
| **E** | Interact (Configure Map at the PLAY easel) |
| **Esc** | Settings / back |

---

## 📱 Controls (phone / tablet)

Hold the phone in **landscape** (a "rotate your device" screen appears in portrait). The game goes full screen on the
first tap where the browser allows it.

| Control | Action |
|---|---|
| Left joystick | Move |
| Drag on the screen | Look around |
| **Jump** (hold) | Jump; hold against a wall to climb (the button reads **Climb** while attached) |
| **Run** | Toggle sprint |
| **Crouch** / **Move Down** (hold) | Crouch or climb down |
| **Paint** / **Done** | Enter / leave Paint Mode (paint by touching your body) |
| **Pose** | Open the pose wheel |
| **Clone** | Place a clone |
| **♪** | Taunt |
| **Leave** | Detach from a wall |
| **FIRE** | Shoot (hunters) |
| **TPS** | Hunter first / third person |
| **👍**, **Skip**, **Next**, **Chat** | Like, skip vote, next spectator target, chat |

All menus scale to fit any screen without cutting off buttons.

---

## 🧩 Game modes

| Mode | Rules |
|---|---|
| **Basic** | Players split into two teams: hunters and chameleons. Hide until the end to win. |
| **Infection** | If you get caught, you become a hunter. Hide until the end to win. |
| **Double** | Everyone hides *and* everyone seeks: each player leaves a painted "statue" of themselves and searches for the others' statues. |
| **Reverse Chicken Race** | A race variant where portraits of the hidden players are shown to the hunters. |

---

## ⚙️ Configure Map — every host setting

Cloned 1:1 from the real game's three-panel Configure Map screen (left: rules, middle: filter + body type, right: map).

**Rules panel**

| Setting | What it does |
|---|---|
| Game Mode | Basic / Infection / Double / Reverse Chicken Race |
| Number of Hunters | How many players start as hunters |
| Hunter Wait Time (sec) | Length of the hide phase |
| Search Time (sec) | Length of the search phase |
| Answer Check Time (sec) | Length of the answer check |
| Forced Taunt Interval (sec) | Every N seconds every chameleon automatically whistles (0 = off) |
| Show Missed-Spot Ranking to Hunters | Whether hunters see the ranking |
| **Start Game** | Starts the countdown |

**Filter panel** — Monochrome, Horror and Mosaic screen filters for extra challenge.

**Body Type** — Default, Cube or Plump chameleon body.

**Map panel** — a big picture of the selected map (a green **?** for Random) and the full map list in the real game's
order (Random, Hide-and-Seek Mansion, Sewer, Backrooms, Indoor Country, Penguin Hotel, Sugar Land, …).

---

## 🦎 The chameleon: painting, poses, clones, body types

- **Seamless 3D painting** — the chameleon body is a seamless skinned mannequin; paint is stored in per-part albedo and
  ORM (occlusion / roughness / metallic) textures, so painted bodies reflect light like the real surface.
- **Paint panel** — colour wheel, value bar, RGB and HSV sliders, a Hex sRGB field, a saved-colour history (mouse wheel
  switches between them), Metallic, Roughness and Emissive (glow paint) sliders, and the **3D Eyedropper** button.
- **3D Eyedropper** — hold Space and aim at the world: it reads the actual rendered colour and the material's metallic
  and roughness values.
- **Key hints** under the panel: Space (eyedropper), RMB (brush size), V (shadow), MMB (rotate camera), Wheel (zoom),
  F (leave Paint Mode).
- **36 poses** — Stand, Sit, Lie Down, Star Jump, Rock, Cactus, Hands Up, Lie on Side, Cross-Legged, Bridge, Raise Hand, Bow, T-Pose, Hands on Hips, Handstand, Banzai, Zazen, Airplane, Thinker, Lightning, Glico, Kneel, Lie Face Down, Curl Up, Squat, Running, Salute, Arms Crossed, Point, Wave, Hug Knees, Flamingo, Fly, Dab, Lean, Crouch.
- **Clones** — place up to two frozen copies of yourself (with your paint and pose) as decoys.
- **Sizes** — Normal and Petit Chameleon (×0.5, if the host allows it).
- **Body types** — Default (rounded), Cube and Plump.
- **Squash & stretch** — characters stretch when they jump and squash when they land.
- **Nameplates** — every player's name floats above them in the game's own rounded font (with a gold 👍 like counter),
  drawn right-to-left for Hebrew and Arabic names.

---

## 🔫 The hunter: paint shotgun and searching

- First-person **paint shotgun** with a colourful graffiti camo pattern, held diagonally with the white chameleon hand.
- Pump-action animation, muzzle flash that lights up the room, rainbow paint trails and paint splatter decals on every
  surface the pellets hit.
- Optional **third-person** view (right mouse) when the host allows it.
- Hunters wait in the lobby during the hide phase and enter at the map's natural entrance when the search begins.
- **Hunters cannot paint themselves.**

---

## 🏆 Missed-Spot Ranking and points

Chameleons earn points while a hunter **looks at them without finding them**:

- The hunter must be within **26 m**, the chameleon must be inside the hunter's field of view, and there must be no wall
  in between (a real ray-cast line-of-sight test).
- The closer the hunter is, the more points per tick (about ×4 when the hunter is right next to you, ×1.2 at 26 m).
- Points are only earned while standing still.
- A floating **+points** number rises on screen — white when the hunter is far, yellow under 10 m, big orange under 4 m —
  with "Hunter nearby · N m".
- Press **Tab** to see the **Missed-Spot Ranking**.

---

## 🗺️ All maps (+ the lobby)

Every map is built procedurally in TypeScript with the shared **Kit** API (`src/game/meccha/maps/kit.ts`): textured
materials with auto-generated normal maps, bevelled boxes, lathes, tubes, extrusions, instanced props, walls with door
openings, collision boxes, climbable surfaces, hider spawns, hunter spawns, area names for the HUD and a lighting rig.
Textures are painted on HTML canvases at load time (`src/game/meccha/maps/tex/*.ts`). Every map has **24 hider spawn
points**, a fully reachable navigation grid for bots, and loads in about a second.

### 0. Lobby (`lobby`)

הלובי: גלריית המתנה (22×18 מ'). כן ציור עם בד "PLAY" (המארח עומד מולו ולוחץ E כדי לפתוח הגדרות), משטח אדום עגול "HUNTER" במרכז (מי שעומד עליו מקבל עדיפות להיות צייד), ותמונה ממוסגרת של כל מפה על הקירות עם שלט פליז. חלונות מזרחיים וצוהר בתקרה מכניסים אור יום; פינת ישיבה, בית קפה, פסלים, קוביות צבעוניות ומראת מתכת כדי להתאמן בהסוואה.

### 1. Hide-and-Seek Mansion (`mansion`)

Hide-and-Seek Mansion (かくれんぼの屋敷) — the default map, rebuilt after the real game's screenshots: green-damask hallways with black/white checker tile, dark wainscoting and party bunting; a grand ballroom (beige marble with black diamond inserts, coffered ceiling, crystal chandeliers, staircase to a balcony, ribbon-streamer walls, balloons, round tables, grand piano, white marble rearing horse); a red-damask storage room with taped boxes; a blue-damask room; an arched wooden library; a restaurant kitchen with blue hex tile; cold storage with meat shelves; a laundry basement with clothes lines and towel piles; a green-tiled bathroom; and a brick basement with a bronze rearing horse.

- Map file: `src/game/meccha/maps/mansion.ts` (1732 lines)
- Texture file: `src/game/meccha/maps/tex/mansion.ts` (1264 lines)

### 2. Indoor Country (`country`)

Indoor Country (屋内カントリー): a huge indoor hall dressed as a farm, as in the real game. Walls painted as a teal sky mural with cartoon clouds and green hills, fluffy cotton clouds hanging from a dark ceiling with small rectangular lights, a mown-stripe grass carpet, red barns with white X doors, white fences, round and rectangular hay bales, Holstein cow cut-outs on yellow A-frame stands (some fallen over), hopper silos, green IBC totes, pallets, a pumpkin patch with soil ridges, a mud mound, a blue/white hot-air balloon and red/white circus tents. Hunters enter from the big sliding door on the south wall.

- Map file: `src/game/meccha/maps/country.ts` (809 lines)
- Texture file: `src/game/meccha/maps/tex/country.ts` (887 lines)

### 3. Sewer (`sewer`)

Sewer (下水道) — a big red-brick storm sewer. Layout (x → east, z → south): - Main Channel: a tall arched brick tunnel with a muddy reflective water channel and raised concrete walkways. - Flood Basin (north): a high chamber with a muddy pool, concrete platforms, sandbag walls and huge rusty pipes. - East Culvert: a narrower arched tunnel lined with black corrugated ducts, neon graffiti, drums and IBC tanks. - Brick Hall (west): broken, uneven floor slabs, bricked-up arches, lockers covered in graffiti, a blue trolley, shelves, a striped tank and a rainbow decoration. - Pink Room: the hidden cosy room (round porthole window, painted windows, pink lamps, red table and chairs). - Maintenance Entrance (south): where hunters arrive.

- Map file: `src/game/meccha/maps/sewer.ts` (1161 lines)
- Texture file: `src/game/meccha/maps/tex/sewer.ts` (747 lines)

### 4. Backrooms (`backrooms`)

Backrooms (バックルーム) — "Level 0": מבוך משרדי ליминלי. טפט צהוב חד־גוני עם דוגמה, שטיח צהוב־חום לח, תקרה אקוסטית עם גופי פלורסנט בוהקים ואחידים, מסדרונות וחדרים חוזרים עם פתחים לא סדירים ועמודים. כל אזור מכיל סוג אחד של חפץ: חדר אסלות, יער תמרורים, אופניים על הקירות, ערימות כיסאות פלסטיק, שורת מכונות משקאות, ושלטי EXIT אדומים זוהרים. הציידים מופיעים באולם המערבי (קצה המבוך).

- Map file: `src/game/meccha/maps/backrooms.ts` (578 lines)
- Texture file: `src/game/meccha/maps/tex/backrooms.ts` (444 lines)

### 5. Penguin Hotel (`penguin`)

Penguin Hotel — a dark-blue hotel: grand two-storey atrium (giant blue plush penguin on a round "BIG PEN" pedestal, crystal chandeliers, balloon arches, bunting, pennants, a wooden gallery balcony on three sides with two staircases), an entrance lobby with reception, a U of diamond-lattice hallways with glossy blue/white checker floors, luggage carts and gold penguin busts, and six rooms (bedrooms with herringbone parquet and blue stripe wallpaper, the plush room with the teal armchair, a lounge and a storage room). Plush penguins with X eyes everywhere. Hunters appear in the entrance lobby (south) when the search starts.

- Map file: `src/game/meccha/maps/penguin.ts` (1359 lines)
- Texture file: `src/game/meccha/maps/tex/penguin.ts` (482 lines)

### 6. Sugar Land (`sugarland`)

Sugarland (シュガーランド): an outdoor land of sweets under a bright pastel sky. Candy mountains with icing caps ring the horizon; inside the wafer/candy-cane fences: a gingerbread village (enterable houses with icing-scale roofs), crowds of gingerbread cookie figures, a giant white strawberry cake on a frosting plaza, a glossy chocolate river with a wafer bridge and chocolate hills, a lollipop & candy-cane forest with a cotton-candy tree, a macaron & donut garden, hard-candy rocks, gumdrops everywhere and a small pastel "locker corner". Hunters enter through the candy-cane arch (south) when the search starts.

- Map file: `src/game/meccha/maps/sugarland.ts` (1020 lines)
- Texture file: `src/game/meccha/maps/tex/sugarland.ts` (473 lines)

### 7. Osaka (`osaka`)

Osaka (大阪): a Dotonbori-style back street on a bright day just after rain, rebuilt after the real game. A long pedestrian street paved with wet granite setts runs north–south between grey/white concrete buildings with roll-up shutters, AC units and silver ducts, covered in vertical Japanese signs (猫カフェ, 免税 焼肉, 肉 居酒屋, 薬). West side: the "うに道楽 本店" restaurant with giant black-spiked sea urchins, a red drugstore with 薬 banners and a tall sign-covered white building. East side: a dark glass corner building with a giant takoyaki octopus climbing it and a pufferfish lantern, a service yard (green kei truck, drums, pallets, lumber, culvert-pipe stack behind a low wall), a white-brick back courtyard (beer kegs, beer crates, a fallen octopus, trash bags) with a graffiti nook, and a scaffold of 大 lanterns. Octagonal concrete benches ring the wooden utility poles; multi-globe lamps line the street. Hunters enter from the south end of the street.

- Map file: `src/game/meccha/maps/osaka.ts` (1065 lines)
- Texture file: `src/game/meccha/maps/tex/osaka.ts` (647 lines)

### 8. Egypt (`egypt`)

Egypt (エジプト): mysterious ancient-Egyptian temple ruins at golden hour. South → north: a sandy open forecourt (ruined perimeter walls, avenue of seated cat statues, obelisks, broken columns, palms, a raised portico and a stair up to the roofs) → a massive battered pylon gateway → a hypostyle hall of 18 papyrus columns with carved hieroglyph bands, star ceiling, a collapsed roof bay and shafts of light → the throne sanctuary with a golden throne on a dais between two seated colossi. Side wings: embalming gallery, burial chamber (sarcophagus, gilded coffin, canopic jars, chests), scribes' gallery and a treasury full of grave goods. Hunters appear at the ruined south gate when the search starts.

- Map file: `src/game/meccha/maps/egypt.ts` (1237 lines)
- Texture file: `src/game/meccha/maps/tex/egypt.ts` (699 lines)

### 9. Death Burger (`deathburger`)

Death Burger (デスバーガー): an abandoned, creepy night-time fast-food amusement park. A red/white striped board fence with string lights rings the park; dark trees loom outside. South: the entrance arch (hunters enter here). Centre: the stone-paved plaza with the "DEATH BURGER" marquee sign on weathered yellow/white planks, a giant soda cup and balloons, a white picket fence and the waving "P" clown mascot statue (parody burger mascot). West-front: the burger-monster tower with its giant eyeball, lantern and tentacles. East: the chicken carousel crowned by a creepy bug. North: the Death Burger diner (front counter, kitchen line, dining booths on the terrace, eyeball-burger roof sign). West: a stage with a row of clown mascots, the circus cage wagon, a birdcage and a pumpkin patch. A backlit menu board stands at the east boundary.

- Map file: `src/game/meccha/maps/deathburger.ts` (1109 lines)
- Texture file: `src/game/meccha/maps/tex/deathburger.ts` (400 lines)

### 10. Greece (`greece`)

Greece (ギリシャ): a Santorini-style hillside village on a caldera cliff at sunset. North → south: the cliff-edge promenade (white parapet over the sea, a blue-domed chapel with a bell tower, a café under a bougainvillea pergola, statues, benches, binoculars) → a row of white houses with blue doors, shutters, balconies and roof-top chimney clusters → the central plaza with a stepped circular pit (rim + tiers + a statue fountain), Greek columns and an olive tree → side quarters with lanes and sunset alley nooks → stair terraces up to an upper terrace with the big blue-domed church, more houses, a windmill, and a second terrace above. Beyond: the village climbing the hill, the caldera rim, the sea with sail boats, islands, and the Acropolis on the horizon. Hunters appear at the east end of the promenade (the path up from the old port).

- Map file: `src/game/meccha/maps/greece.ts` (1187 lines)
- Texture file: `src/game/meccha/maps/tex/greece.ts` (369 lines)

### 11. Deep Sea (`deepsea`)

Deep Sea (深海): a sunlit sea floor in a rocky canyon. Rippled sand with caustic light pools and god rays, a sunken plaza with a marble UNICORN STATUE on a plinth ringed by broken columns, a SHIPWRECK you can walk into (planked hull with a smashed side, broken deck, masts, a fallen mainmast ramp, barrels, chests, cannons, anchor), a KELP forest, a CORAL reef (brain, staghorn, table, fan, tube and pillar corals, anemones with clownfish), a pearl garden with GIANT CLAMS, JELLYFISH drifting overhead, schools of tropical FISH, starfish, urchins, shells and bubbles. Hunters arrive through the ruined stone gate in the south when the search starts.

- Map file: `src/game/meccha/maps/deepsea.ts` (1321 lines)
- Texture file: `src/game/meccha/maps/tex/deepsea.ts` (566 lines)

### 12. Shopping Mall (`mall`)

Shopping Mall (official map) — a bright two-level indoor mall around a glass barrel-vault skylight atrium. Ground floor: atrium with paint-splash floor art, criss-cross escalator pairs with glass balustrades, painted pillars, a giant glossy balloon sculpture in a round planter, a tiered handbag display, planters with benches, directory totems, kiosks and floor merchandise; a food court (three fast-food stalls incl. BURGER BLAST, 24 tables with clutter), and shops: TUNE TOWN (instruments), MODA LUNA (fashion: racks, mannequin clusters, fitting rooms), STEP UP (shoes & bags), TOY PLANET (giant teddy, ball pit), PIXEL PALACE (arcade), FRESH MART (grocery) and VOLTEX (electronics). Upper floor: a gallery ring with glass railings, a café kiosk, massage chairs, vending machines, luggage and lounge props and window displays of eight more shops. Hunters enter from the south entrance hall.

- Map file: `src/game/meccha/maps/mall.ts` (1794 lines)
- Texture file: `src/game/meccha/maps/tex/mall.ts` (608 lines)

### 13. Kyoto (`kyoto`)

Kyoto — an indoor Kyoto-Station-style atrium at night during an autumn festival. A huge white steel lattice vault (stars behind it) spans the hall. North: the grand stairs ("dai-kaidan") with luminaries forming 大, twin escalators and an upper terrace with a fence, lamps and red maple trees. West: the white tiled station building with a cantilevered bowl balcony (maple on top) and a lit shamisen billboard. East: the dark marble wall with two white towers crowned by lattice cubes, Gion lantern walls, glowing maple panels and a senbon-torii tunnel. Centre: festival lanes with tsuiji fences, yatai stalls, lanterns, wagasa umbrellas, bamboo clusters, kimono dolls and a rock garden. South: the station garden with planters and a gold-railed balcony with bamboo.

- Map file: `src/game/meccha/maps/kyoto.ts` (1094 lines)
- Texture file: `src/game/meccha/maps/tex/kyoto.ts` (503 lines)

### 14. Art Museum (`museum`)

Art Museum (official map, 美術館): a classical museum around a sky-lit Grand Hall. Lobby with ticket desk (hunters enter here) → Grand Hall (columns, skylights, giant white chameleon statue) → West: Impressionist Gallery + World Paintings (real masterpieces in gilded / dark frames) → East: Meccha Exhibit (objects from the game: paint bucket, paint shotgun, penguin, burger, cube, duck, PLAY easel) and Sculpture Court → North: World Miniatures (Eiffel Tower, Colosseum, Pisa, Taj Mahal, Big Ben, Liberty, pyramids, Tokyo Tower, Mt Fuji, Moai) and the dim Lesser Wing with night paintings.

- Map file: `src/game/meccha/maps/museum.ts` (1002 lines)
- Texture file: `src/game/meccha/maps/tex/museum.ts` (804 lines)

### 15. Art Gallery (`gallery`)

Art Gallery (popular Steam Workshop map): a classic European picture gallery. Rotunda entrance with a Roman floor mosaic and sculpture niches → the barrel-vaulted Grand Gallery with huge canvases and a skylight strip → Portrait Hall (a row of gilded portraits on green damask) → the dim Lesser-Known Wing → Salon Rouge (salon hang, star portrait behind a velvet rope) → Sculpture Hall with arched niches.

- Map file: `src/game/meccha/maps/gallery.ts` (541 lines)
- Texture file: `src/game/meccha/maps/tex/gallery.ts` (180 lines)

### 16. Cold Storage (`coldstorage`)

Cold Storage — a working meat cold-store at night. Hunters come in through the LOADING DOCK (two roll-up shutters, pallet racking, a yellow forklift, wrapped pallets, pallet jack, wheelie bins), which opens through PVC strip curtains into COLD ROOM 2 (+2 °C: chrome wire racks full of cartons, crates and vacuum packs, two overhead meat rails with hanging pig halves and beef quarters, roll cages, a floor scale). North of it lie the BLAST FREEZER (-25 °C: white insulated panels, frost everywhere, frozen pallets, fish on ice, an evaporator with icicles) and the BUTCHERY (grey-green embossed tile walls, stainless prep tables, bandsaw, mincer, sinks, knife rail, hooks with meat). The east wing holds the MACHINE ROOM (ammonia compressors, gas cylinder cluster, electrical cabinets, frosted pipe runs, a spinning condenser fan, workbench) and the OFFICE / BREAK ROOM.

- Map file: `src/game/meccha/maps/coldstorage.ts` (1202 lines)
- Texture file: `src/game/meccha/maps/tex/coldstorage.ts` (739 lines)

### 17. Brick Loft (`brickloft`)

Brick Loft — a converted 1900s warehouse apartment at dusk. Bare red-brick walls with arched steel windows and stone-trimmed arches, a timber beam-and-joist ceiling (6 m) with spiral ductwork, cast-iron columns and Edison pendants. Areas: ENTRANCE (front door, bike, coat rack, moving boxes — hunters arrive here), LIVING ROOM (leather chesterfield, rug, pool table, record player, big bookcases, spinning ceiling fans), KITCHEN (shaker cabinets, marble island with stools, range + hood, open shelves, long dining table), ARTIST STUDIO (easels with real paintings, stacked canvases, paint-splattered floor, work table), LIBRARY under a steel MEZZANINE (reached by an iron stair; desk + beanbag on top), BEDROOM (painted brick, pipe clothes rack, bed) and BATHROOM (subway tile, clawfoot tub, washer + dryer).

- Map file: `src/game/meccha/maps/brickloft.ts` (1199 lines)
- Texture file: `src/game/meccha/maps/tex/brickloft.ts` (288 lines)

### 18. Swimming Pool (`pool`)

Swimming Pool — an indoor municipal pool hall ("City Aquatic Centre"). Centre: a 25 m × 10 m five-lane pool (sunken, animated reflective water, floating lane ropes, starting blocks, chrome ladders, backstroke flags, floating toys). The whole hall deck sits on a raised tiled slab (D = 0.44 m) so the pool basin can be entered on foot and players wade chest-deep in the water. North: red-seat spectator bleachers under a big "SPLASH!" graffiti mural; loungers along the deck. East: tall daylight windows, a kids' splash pool with a mushroom fountain and a little slide, potted palms. West: starting end with the lane-rope reel, a staircase up to the mezzanine on the changing-block roof, scoreboard. South: the changing block — Men's and Women's changing rooms (lockers, benches, sinks, mirrors), open showers, equipment storage, lifeguard office / first aid and the entrance lobby (reception, vending machines) where hunters arrive.

- Map file: `src/game/meccha/maps/pool.ts` (1103 lines)
- Texture file: `src/game/meccha/maps/tex/pool.ts` (443 lines)

### 19. Cherry Blossom Garden (`sakura`)

Cherry Blossom Garden — a Japanese stroll garden at the peak of spring (hanami season), bright daylight. Centre: a lobed koi pond with a vermilion drum bridge, stepping stones, lily pads, floating petals and koi. South: the roofed entrance gate and plaza (hunters arrive here), a dango food stall with a red parasol bench. East: the hanami lawn with blue picnic tarps, bento boxes, lantern garlands strung between cherry trees; the stream with a turning water wheel and a mill hut, and a bamboo grove in the north-east corner. North-west: the tea house (raised tatami floor, shoji, tiled hip roof, engawa, tsukubai basin with a deer scarer). West: a raked gravel rock garden; south-west: a small shrine with a torii, hokora and ema rack. Everything is ringed by a bamboo fence with distant blue mountains beyond.

- Map file: `src/game/meccha/maps/sakura.ts` (1237 lines)
- Texture file: `src/game/meccha/maps/tex/sakura.ts` (334 lines)

### 20. Meeting Room (`meeting`)

Meeting Room — a loft-style office floor in an old brick warehouse on a sunny afternoon. Oiled oak floors, whitewashed brick walls, a dark wood-slat ceiling with black spiral ducts and big steel factory windows looking out over the city. Areas: a glass-walled conference room (black Crittall partitions, 7 m walnut table, 14 office chairs, wall TV, whiteboard, credenza), an open-plan cubicle maze on grey carpet tiles (quads of desks with screens, monitors, keyboards, drawers, sticky notes, mugs, cables), a print corner (copiers, filing cabinets, paper boxes), the reception (slatted oak desk in front of a moss wall with the company logo, waiting area, glass entrance), a lounge (chesterfield sofas, pallet coffee table on a marble rug, foosball, red beanbags, ceiling fan, bookshelf divider, real masterpieces on the brick) and a kitchenette (subway tiles, coffee machine, fridge, vending machine, water cooler, bistro tables). Hunters come in through the glass entrance at the reception.

- Map file: `src/game/meccha/maps/meeting.ts` (1523 lines)
- Texture file: `src/game/meccha/maps/tex/meeting.ts` (960 lines)

### 21. School (`school`)

School — a Japanese high school on a late afternoon. A long glossy corridor (vinyl tiles, mint wainscot, shoe lockers, stainless water fountain with lemon soap, class signs, framed masterpieces) links two classrooms (2-A, 2-B: 30 steel-frame desks + chairs, platform + lectern, chalk blackboards, cork notice boards, back cubby lockers stuffed with bags, curtains, goldfish tank), a music room (grand piano, marimba, drum kit, timpani, guitars, music stands, chairs on a carpet), a science lab (black-top benches with sinks and goosenecks, stools, beakers/flasks, glass cabinets, fume hood, skeleton model), a small gym (maple floor with court lines, hoop, stage with curtains, wall bars, mats, vaulting box, ball carts) and the entrance (genkan) with rows of getabako. The low sun comes through the south windows. Hunters appear at the entrance.

- Map file: `src/game/meccha/maps/school.ts` (1705 lines)
- Texture file: `src/game/meccha/maps/tex/school.ts` (1144 lines)

### 22. Amusement Park (`amusement`)

Amusement Park: "Chameleon Land", a bright, colourful theme park on a sunny day. Hunters enter from the south forecourt through the big striped entrance arch flanked by two ticket booths. A red-brick avenue with festoon lights, benches and a balloon vendor leads north to a round fountain plaza (flowing water). West: a carousel with 16 galloping horses under a red/white striped canopy, a game alley along the south fence (balloon darts, a shooting gallery with plush prizes, ring toss) and a high striker. East: a teacup ride around a giant teapot, food stands (popcorn cart, cotton candy kiosk, ice cream kiosk with a giant cone) and picnic tables. North: a 20 m Ferris wheel with 12 climbable cabins, a roller-coaster section on red supports with a station and a three-car train (north-east), and a covered bumper-car arena on a glossy steel floor (north-west).

- Map file: `src/game/meccha/maps/amusement.ts` (1239 lines)
- Texture file: `src/game/meccha/maps/tex/amusement.ts` (402 lines)

### 23. Hot Spring Inn (`onsen`)

Hot Spring Inn — a traditional onsen ryokan at dusk. South: gravel forecourt behind a tiled tsuiji wall (hunters arrive here), entrance with noren, genkan with a stone doma, shoe boxes, slippers, reception counter and a gold byobu. Centre: a lantern-lit wooden corridor. West wing: three tatami guest rooms (low tables, zabuton, zaisu, tokonoma with scrolls, futon stacks, andon) and a souvenir shop. East wing: game corner (ping-pong, vending machines, arcade cabinet), changing room (lockers, basket shelves, vanity, massage chair) and the indoor hinoki bath with wash stations, buckets and stools. North: the engawa veranda along the garden (koi pond with a bridge, maples, pines, stone lanterns, bamboo grove, dry gravel garden, red nodate bench) and, behind a bamboo fence, the rotenburo — a steaming rock bath with a bamboo spout, boulders, lanterns and a pavilion.

- Map file: `src/game/meccha/maps/onsen.ts` (1388 lines)
- Texture file: `src/game/meccha/maps/tex/onsen.ts` (628 lines)


---

## 🖥️ Menus and screens

- **Loading screen** — the game's key art with a fast rainbow progress bar.
- **Main menu** — brick-wall background with the MECCHA CHAMELEON logo: **Create Server**, **Find Server**, **Settings**,
  **Quit game**, a row of 13 language buttons, the **MAPS** tile, **Credits** and (in the Windows app) **Update**.
- **Create Server** — name to display in-game, server name, password, region tag and server tags, a preview card of
  your server, **Play Offline (with Bots)**.
- **Find Server** — search by server name or list all public servers; rainbow result cards with player counts and tags;
  password-protected servers show a 🔒 and ask for the password; full servers are refused.
- **Settings** — User Management, Friends List, Sound, Graphics, General Game Settings and FAQ tabs (Q/E switch tabs).
- **Maps** — every map with its picture.
- **Credits** — "Created by Tom Kodner" with a description of the game and everything that was built.
- **In-game HUD** — hider/hunter pictograms around a green hourglass at the top, the timer with "Until Search Starts" /
  "Search Time" / "Answer Check", the area name, the key column on the right, the mode name and description at the
  bottom right, key chips at the bottom (Crouch / Climb / Clone…), the Missed-Spot Ranking tab on the left and the
  big "Search Start!" announcement.

---

## 🔧 Settings

| Tab | Options |
|---|---|
| Sound | Master volume, BGM volume, sound-effect volume, mute |
| Graphics | Resolution, screen mode, Apply, motion blur, frame-rate limit, VSync, shadow quality, texture quality, global illumination, effects quality, anti-aliasing, shading, reflection |
| General Game Settings | Mouse sensitivity, field of view, language |
| FAQ | How to become a hunter, start a game, paint, pose, use clones; full control list |

All settings are saved in the browser and survive a reload.

---

## 🌐 Multiplayer and servers

- **Inside a claude.ai artifact page** the game uses the page's live **room** channel: each server is a scoped channel
  inside the room (`scopedRoomNet` in `src/game/meccha/net.ts`). The host advertises the server's name, tags, player limit
  and a hashed password in its presence, so it appears in **Find Server** for everyone on the page.
- **As a normal web page / the Windows app** the game uses **WebRTC peer-to-peer** (PeerJS) with server codes.
- **Offline** mode runs locally with bots.
- The host runs the round logic (phases, timers, roles, bots); clients send their position, pose, paint, clones, chat,
  shots, likes and votes. Painting is synchronised as compact strokes.
- **Host migration**: if the host leaves, the next player who joined becomes the host automatically.
- Floor balloons and balls are pushed by players and their motion is broadcast so every client sees the same thing.

---

## 🤖 Bots

Bots can be hiders or hunters. Bot hiders pick a spot, choose a pose and **paint themselves to match the surface next to
them**; bot hunters patrol the map, look around and shoot at suspicious shapes. Three difficulty levels exist in code.

---

## ✨ Graphics and rendering technology

- **Three.js** WebGL renderer with ACES filmic tone mapping, physically based materials and HDR environment lighting.
- **Lamp-following key light** — indoors, the shadow-casting light comes from the lamp nearest to you, so shadows change
  direction as you walk around; ceilings of merged architecture are cut out of the shadow pass so they don't block it.
- **Soft PCF shadows** for furniture, props and characters (instanced props cast shadows too).
- **GTAO** ambient occlusion, motion blur (afterimage), screen filters (monochrome / horror / mosaic).
- **Real-time reflection probe** (cube camera) per map for glossy floors.
- **Surface wear shader** — every surface gets subtle stains, dust near the floor, grime in corners and variation in
  colour and roughness, so nothing looks like a flat single colour.
- **Animated water** (`userData.flow`) with water sound that gets louder as you approach, dripping sounds and flickering,
  sometimes failing lamps in dark maps.
- **Spinning props** (ceiling fans, a water wheel…), **pushable balloons and balls**.
- **Real paintings** — famous public-domain masterpieces hang in the maps.
- Pre-rendered map thumbnails so the lobby never stalls.

---

## 🔊 Sound

Procedural Web Audio sound effects (clicks, ticks, correct / wrong, win, whistles, shotgun, bumps), background music,
water ambience and drips, all routed through master / BGM / SFX volume controls.

---

## 🗣️ Languages (13) and right-to-left support

日本語 · English · 简体中文 · 繁體中文 · Português (Brasil) · Español · Français · 한국어 · عربي · Italiano · Deutsch · Русский · עברית

- Over **600 translated strings** per language: every menu, setting, FAQ answer, HUD label, area name, pose name, bot name,
  mode description, error message and number format.
- **Real RTL** for Hebrew and Arabic: every line of text takes its own language direction, so punctuation and numbers
  never end up on the wrong side; inputs and nameplates are direction-aware too.
- English is the default language.

---

## 💻 The Windows app (EXE) and the Update button

`release/MecchaChameleon.exe` is a tiny Go program (`release/launcher/main.go`) that:

1. Embeds the whole game (`meccha-chameleon.html`).
2. Starts a local web server on a free port and opens the game in your default browser.
3. Shows an **Update** button in the main menu. Clicking it downloads the newest `release/meccha-chameleon.html` from
   GitHub, saves it in `%LOCALAPPDATA%\MecchaChameleon` and restarts the game — no new EXE needed. (The download URL can
   be overridden with an `update_url.txt` file next to the EXE. The repository must be public for the default URL to work.)

---

## 🛠️ Building from source

Requirements: Node.js 20+, npm (or bun), and Go 1.21+ for the launcher.

```bash
npm install
npm run dev                 # the full site; the game is at /chameleon
npx tsc --noEmit -p .       # type-check
```

Single-file build (the same file as `release/meccha-chameleon.html`):

```bash
cp -r dev/preview-tmp .preview-tmp
npx vite build --config .preview-tmp/vite.config.mjs   # → .preview-tmp/dist/app.js + css
python3 release/launcher/build_html.py                  # inlines everything into one HTML file (edit paths inside)
```

Windows launcher:

```bash
cp release/meccha-chameleon.html release/launcher/game.html
cd release/launcher && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -o MecchaChameleon.exe .
```

---

## 🧪 Developer tools and automated QA

- `dev/preview-tmp/` — Vite configs: the single-file build, the full app on port 5181 and the **map harness** on port 5180.
- `dev/tools/shot.mjs <map>` — builds a map in a headless browser, prints stats (build time, triangles, reachable cells,
  free hider spawns) and saves a preview, an overview and eight eye-level screenshots.
- `dev/tools/prof*.mjs`, `cpuprof.mjs` — build-time and texture profiling.
- `dev/tools/gen_thumbs.py` — regenerates the lobby map pictures.
- `dev/tools/allmaps.mjs` — builds all maps and checks errors and spawns.
- `dev/tools/record.mjs` — records a 5-minute gameplay video of bots playing.
- `dev/tools/fakeroom.js` — fakes the artifact room so several browser tabs can play together in tests.
- `dev/qa/` — automated QA: `mp*.mjs` (3-client multiplayer rounds, host leaving), `srv.mjs` (create/find server with
  password), `off.mjs` (offline rounds with bots), `audit-menu.mjs` / `audit-game.mjs` (click every button and key),
  `phone.mjs` (touch controls, landscape + portrait), `rtl.mjs` (Arabic/Hebrew layout), `balls.mjs` (balloon sync),
  `skip.mjs`, `roles.mjs`, `keys.mjs`.
- `dev/spec/` — `MODELING.md` (the map-building guide), `RESEARCH.md` (research notes about the real game),
  `REFERENCE.md` (what each real map looks like).

---

## 📂 Project structure — every source file

```
   1264 src/components/MecchaGame.tsx
    449 src/components/MecchaMenu.tsx
    621 src/game/meccha/character.ts
   3599 src/game/meccha/engine.ts
    323 src/game/meccha/fx.ts
    124 src/game/meccha/gun.ts
     44 src/game/meccha/hdri.ts
   3091 src/game/meccha/i18n-langs.ts
     97 src/game/meccha/i18n.ts
   1239 src/game/meccha/maps/amusement.ts
    578 src/game/meccha/maps/backrooms.ts
   1199 src/game/meccha/maps/brickloft.ts
   1202 src/game/meccha/maps/coldstorage.ts
    809 src/game/meccha/maps/country.ts
   1109 src/game/meccha/maps/deathburger.ts
   1321 src/game/meccha/maps/deepsea.ts
   1237 src/game/meccha/maps/egypt.ts
    541 src/game/meccha/maps/gallery.ts
   1187 src/game/meccha/maps/greece.ts
     61 src/game/meccha/maps/index.ts
    367 src/game/meccha/maps/kit.ts
   1094 src/game/meccha/maps/kyoto.ts
    611 src/game/meccha/maps/lobby.ts
   1794 src/game/meccha/maps/mall.ts
   1732 src/game/meccha/maps/mansion.ts
   1523 src/game/meccha/maps/meeting.ts
   1002 src/game/meccha/maps/museum.ts
   1388 src/game/meccha/maps/onsen.ts
   1065 src/game/meccha/maps/osaka.ts
   1359 src/game/meccha/maps/penguin.ts
   1103 src/game/meccha/maps/pool.ts
   1237 src/game/meccha/maps/sakura.ts
   1705 src/game/meccha/maps/school.ts
   1161 src/game/meccha/maps/sewer.ts
   1020 src/game/meccha/maps/sugarland.ts
    402 src/game/meccha/maps/tex/amusement.ts
    444 src/game/meccha/maps/tex/backrooms.ts
    288 src/game/meccha/maps/tex/brickloft.ts
    739 src/game/meccha/maps/tex/coldstorage.ts
    887 src/game/meccha/maps/tex/country.ts
    400 src/game/meccha/maps/tex/deathburger.ts
    566 src/game/meccha/maps/tex/deepsea.ts
    699 src/game/meccha/maps/tex/egypt.ts
    180 src/game/meccha/maps/tex/gallery.ts
    369 src/game/meccha/maps/tex/greece.ts
    503 src/game/meccha/maps/tex/kyoto.ts
    547 src/game/meccha/maps/tex/life.ts
    359 src/game/meccha/maps/tex/lobby.ts
    608 src/game/meccha/maps/tex/mall.ts
   1264 src/game/meccha/maps/tex/mansion.ts
    960 src/game/meccha/maps/tex/meeting.ts
    804 src/game/meccha/maps/tex/museum.ts
    628 src/game/meccha/maps/tex/onsen.ts
    647 src/game/meccha/maps/tex/osaka.ts
    482 src/game/meccha/maps/tex/penguin.ts
    443 src/game/meccha/maps/tex/pool.ts
    334 src/game/meccha/maps/tex/sakura.ts
   1144 src/game/meccha/maps/tex/school.ts
    747 src/game/meccha/maps/tex/sewer.ts
    473 src/game/meccha/maps/tex/sugarland.ts
      3 src/game/meccha/menuart.ts
      7 src/game/meccha/models.ts
    166 src/game/meccha/nav.ts
    310 src/game/meccha/net.ts
    121 src/game/meccha/paintings.ts
      2 src/game/meccha/poseicons.ts
    676 src/game/meccha/textures.ts
     21 src/game/meccha/thumbs.ts
    179 src/lib/sound.ts
     19 src/routes/chameleon.tsx
  54677 total

```

Key files:

| File | Role |
|---|---|
| `src/routes/chameleon.tsx` | The `/chameleon` page (fonts, mounts the game) |
| `src/components/MecchaGame.tsx` | Game UI: screens flow, HUD, Configure Map, paint panel, pose wheel, chat, touch controls |
| `src/components/MecchaMenu.tsx` | Loading screen, main menu, server screens, settings, maps, credits, Update button |
| `src/game/meccha/engine.ts` | The game engine: rendering, input, movement & climbing, rounds, networking sync, painting, shooting, bots, lighting |
| `src/game/meccha/net.ts` | Networking: local, artifact room (named servers), WebRTC |
| `src/game/meccha/character.ts` / `models.ts` | Chameleon body, poses, sizes, body types, nameplates |
| `src/game/meccha/gun.ts` / `fx.ts` | Paint shotgun model and paint effects |
| `src/game/meccha/nav.ts` | Navigation grid for bots |
| `src/game/meccha/i18n.ts` / `i18n-langs.ts` | 13-language translation system |
| `src/game/meccha/paintings.ts` | Real paintings used in the maps |
| `src/game/meccha/maps/kit.ts` | The map-building kit |
| `src/game/meccha/maps/*.ts`, `tex/*.ts` | The 23 maps and the lobby, and their canvas textures |
| `src/lib/sound.ts` | Procedural audio |
| `release/` | Playable builds and the Windows launcher |
| `dev/` | Build configs, tools, QA scripts, design notes |

---

## 📜 How it was built — development history

The game was built step by step in a long series of sessions directed by Tom Kodner:

1. **The idea** — start from a short video of MECCHA CHAMELEON and recreate "the game where you paint yourself".
2. **Core game** — white rounded chameleon, painting on the body, poses, Normal/Petit sizes, sprinting, jumping into
   walls and climbing walls and ceilings.
3. **The hunter** — the paint shotgun with pump animation, rainbow splatter and muzzle flash; hunters waiting in the
   lobby during the hide phase.
4. **Real-game research** — controls, settings, modes, HUD and map layouts collected from guides and screenshots, written
   down in `dev/spec/RESEARCH.md` and `REFERENCE.md`.
5. **Maps, wave after wave** — Mansion, Indoor Country, Sewer, Backrooms, Penguin Hotel, Sugar Land, Osaka, Egypt, Death
   Burger, Greece, Deep Sea, Shopping Mall, Kyoto, Art Museum and Art Gallery, then School, Amusement Park and Hot Spring
   Inn, and finally Cold Storage, Brick Loft, Swimming Pool, Cherry Blossom Garden and Meeting Room.
6. **Realism** — real famous paintings instead of fake ones, more light, shadows and reflections, flickering lamps,
   flowing water with sound, lamp-following shadows, surface wear and dirt on every object, better furniture models.
7. **Details** — chewing gum under school desks, Hebrew handwriting on notebooks (Tom Kodner, class ט'3), chalk writing on
   the blackboard, letters and notes signed by Tom Kodner around the maps, the Osaka restaurant signs reading 汤姆·科德纳.
8. **The lobby and menus** — cloned 1:1 from screenshots of the real game: key-art loading screen, brick-wall main menu,
   server screens, settings tabs and the three-panel Configure Map; removing everything that is not in the real game.
9. **Multiplayer for real** — named servers with passwords and player limits that work inside the shared page, live server
   lists, host migration, synchronised paint, poses, clones, chat, shots, likes, votes and balloons.
10. **Languages** — all 13 languages of the real game plus Hebrew, with full right-to-left support.
11. **Phone support** — layout that always fits, rotate hint, full screen, joystick and touch buttons.
12. **QA** — automated agents played multiplayer rounds, pressed every button, tested every setting and phone controls,
    and fixed the bugs they found (skip votes during answer check, like counts, balloon sync, mute persistence, Esc
    handling, and more).
13. **Windows app** — the EXE launcher with an Update button.

---

## 🧾 Full commit log

- **2025-01-01** — template: tanstack_start_ts_2026-05-12
- **2026-05-17** — Changes
- **2026-05-17** — Changes
- **2026-05-17** — Changes
- **2026-05-17** — Changes
- **2026-05-17** — Changes
- **2026-05-17** — Changes
- **2026-05-17** — הוסף משחק טריוויה דיגיטלי
- **2026-05-17** — Changes
- **2026-05-17** — Changes
- **2026-05-17** — הוסף משחק טריוויה בעברית
- **2026-05-18** — Work in progress
- **2026-05-18** — Changes
- **2026-05-18** — Changes
- **2026-05-18** — עדכן את שאלות הלימוד
- **2026-05-18** — Changes
- **2026-05-18** — Changes
- **2026-05-18** — Changes
- **2026-05-18** — Changes
- **2026-05-18** — Changes
- **2026-05-18** — Changes
- **2026-05-18** — Changes
- **2026-05-18** — Changes
- **2026-05-18** — Implemented trivia UI enhancements
- **2026-05-19** — Work in progress
- **2026-05-19** — Changes
- **2026-05-19** — Changes
- **2026-05-19** — Changes
- **2026-05-19** — Changes
- **2026-05-19** — הוסף פילטרי וסאונד לחידון
- **2026-09-23** — הוסף משחק ציור 'הזיקית המציירת'
- **2026-09-23** — Meccha Chameleon: 3D hide-and-seek clone instead of the drawing game
- **2026-09-23** — Meccha Chameleon: keep HUD buttons on one line on phones
- **2026-09-23** — Meccha Chameleon: multiplayer clone with the real game's mechanics
- **2026-09-23** — Meccha Chameleon: real-game rework (3D lobby, 7 maps, clones, answer check, likes, new UI)
- **2026-09-24** — Meccha Chameleon: Blender skinned character, 3D painting, lobby wait for hunters, real settings, shotgun FX, sounds, new maps (WIP)
- **2026-09-24** — Meccha Chameleon: map work in progress (agents)
- **2026-09-24** — Meccha Chameleon: map work in progress (agents)
- **2026-09-24** — Meccha Chameleon: Hebrew UI language, lobby mute button, UI click sounds, fix negative frame step stalling the HUD
- **2026-09-24** — Meccha Chameleon: fix Osaka map declaration order
- **2026-09-24** — Meccha Chameleon: HUD layout from real screenshots (hourglass bar, key column, mode text, key chips, missed-spot tab, Search Start), rotation lock, like nameplates, graffiti shotgun + white arm
- **2026-09-24** — Meccha Chameleon: paint panel laid out like the real colour picker (wheel + V/A bars, RGBA/HSV, Hex sRGB, 32-colour history, Metallic/Roughness, overwrite-on-sample, 3D Eyedropper, key guide)
- **2026-09-24** — Meccha Chameleon: footsteps sound different on tile, wood, carpet/grass and metal
- **2026-09-24** — Meccha Chameleon: Shift detaches from walls, Tab toggles Missed-Spot Ranking (real keybinds)
- **2026-09-25** — Meccha Chameleon: character remodelled after the real mannequin (1.7 m, smooth continuous torso, round head on short neck, mitten hands, rounded leg stumps)
- **2026-09-25** — Meccha Chameleon: Mansion and Penguin Hotel rebuilt from real screenshots (ballroom, damask halls, atrium penguin statue, balloon arches), within triangle budget
- **2026-09-25** — Meccha Chameleon: Osaka street and Indoor Country rebuilt from real screenshots
- **2026-09-25** — Meccha Chameleon: real public-domain masterpieces (Van Gogh, Leonardo, Vermeer, Monet) in the Mansion's frames
- **2026-09-25** — Meccha Chameleon: register 6 Steam Workshop maps (20 maps total)
- **2026-09-25** — Meccha Chameleon: PC-style title screen (brick-wall key art, Start/Settings/Quit, Create Server / Find Server with public list and code search) and dark game-style panels
- **2026-09-25** — Meccha Chameleon: soft 4K sun shadows fitted to each map, overhead key light for indoor maps, shadow-casting lamps on high quality, ceilings no longer block light
- **2026-09-25** — Meccha Chameleon: desktop HUD without beginner/mobile hints; E prompt 'Configure Map'
- **2026-09-25** — Meccha Chameleon: Create Server with server name, password and max players; password/full checks on join; solo rooms preview the map (hunter wait → answer check)
- **2026-09-25** — Meccha Chameleon: Deep Sea loads in ~1.7 s instead of 15 s (cheap shipwreck plank texture)
- **2026-09-25** — Meccha Chameleon: faster start and no lobby stutter — pre-rendered map pictures and pose icons, round map chosen at countdown and pre-built during it
- **2026-09-25** — Meccha Chameleon: Kyoto map (station atrium under steel lattice roof, grand stairs, escalators, torii tunnel, festival stalls, maples, lantern walls)
- **2026-09-25** — Meccha Chameleon: lobby restyled as a brick-walled paint studio (key-art brick, paint splats on walls and floor, open paint cans)
- **2026-09-25** — Meccha Chameleon: Art Museum, Art Gallery, Death Burger, Greece, Shopping Mall and a denser Sewer from real screenshots; CPU-backed helper canvases (first texture no longer stalls for seconds); lobby pictures for all built maps
- **2026-09-25** — Meccha Chameleon: game keeps running when the host's tab is hidden; lighter shadows (2K sun, no per-lamp cube shadows) for smooth frame rate
- **2026-09-25** — Meccha Chameleon: Roboto UI font like the game's Unreal Engine interface
- **2026-09-25** — Meccha Chameleon: map reflection probes (glossy floors, water and metal reflect the real room), flowing sewer water with water ambience and drips, flickering lamps, glossier floors
- **2026-09-25** — Meccha Chameleon: register School, Amusement Park and Hot Spring Inn maps
- **2026-09-25** — Meccha Chameleon: title flow cloned from the real game — key-art loading screen with progress bar, brick-wall main menu (Create Server / Find Server / Settings / Quit game, language row, MAPS), server screens with name/server/password, region & server tags, search results and Downloaded Mods, full Settings (User Management, Friends List, Sound, Graphics, General, FAQ) wired to real engine options, Configure Map laid out like the game; rounded game font
- **2026-09-25** — Meccha Chameleon: Credits (Tom Kodner) instead of Discord/X tiles, no version label, game logo kept on all menu screens; Osaka and Kyoto signs read TOM KODNER
- **2026-09-25** — Meccha Chameleon: restore original Osaka/Kyoto signs; restaurant signs (izakaya, yakiniku, noren) read Tom Kodner in Chinese (汤姆·科德纳)
- **2026-09-26** — Meccha Chameleon: all 13 menu languages work (日本語, English, 简/繁中文, Português, Español, Français, 한국어, عربي, Italiano, Deutsch, Русский, עברית) with RTL for Arabic/Hebrew; game font stack M PLUS Rounded 1c + Noto CJK/Arabic/Hebrew
- **2026-09-26** — Meccha Chameleon: real indoor shadows (angled key light, ceilings and upper floors of merged architecture no longer block it, instanced props like chairs/tables/boxes cast shadows, lower fill light); new maps School, Amusement Park and Hot Spring Inn
- **2026-09-26** — Meccha Chameleon: key light follows the nearest lamp (shadows change direction as you move), surface wear/dirt shader, pushable floor balloons and balls, squash & stretch, menu animations, phone layout (menus always fit, rotate hint, fullscreen, hold-to-climb, run), English default, Hebrew handwriting font preload
- **2026-09-26** — Meccha Chameleon: Create/Find Server work inside the artifact page (named servers over the live room: server list, password, player limit, join) instead of blocked WebRTC; Missed-Spot points rise on screen when a hunter looks at you from close by (closer = more points), bot hunter view direction fixed; nameplates drawn in the game font and redrawn when it loads
- **2026-09-26** — Meccha Chameleon: Meeting Room map — glass conference room, cubicle pods, manager office, print corner, reception, lounge with ceiling fan, kitchenette; readable memos, letters, sticky notes, whiteboards (Tom Kodner desk plate and memo)
- **2026-09-26** — Meccha Chameleon: Cold Storage finished (realistic carcasses, dock, paperwork incl. Tom Kodner delivery note) and new Brick Loft map (brick warehouse loft with mezzanine, studio, library, neon, fans, pushable balls, readable notes)
- **2026-09-27** — Meccha Chameleon: school detail pass — bent-plywood chairs, real desks with shelves and bags, chewing gum, scribbles and dirt, Hebrew handwriting on papers (Tom Kodner ט'3 test, homework, notes), chalk blackboards, bulletin board with class list
- **2026-09-27** — Meccha Chameleon: full UI translation in all 13 languages — 395 more strings (Hebrew gaps filled, HUD area names, poses, bots, modes, settings options, FAQ, errors, formats); pose names in the pose wheel
- **2026-09-27** — Meccha Chameleon: real RTL for Hebrew/Arabic — every text line takes its own language direction (punctuation/numbers no longer on the wrong side), auto-direction inputs, RTL nameplates
- **2026-09-27** — Meccha Chameleon: QA fixes — skip votes/likes/points sync during answer check, own likes on scoreboard, floor balloons synced across clients, mute persists, SE volume for drips, Esc on MAPS and panels, working mod refresh button, Configure Map fits on phones, missing translations, safer touch handlers
- **2026-09-27** — Meccha Chameleon: phone buttons for crouch/climb down and hunter first/third person
- **2026-10-02** — Meccha Chameleon: Swimming Pool and Cherry Blossom Garden maps finished; readable letters, notes, labels and posters (some for Tom Kodner) plus model upgrades across the other maps
- **2026-10-02** — Meccha Chameleon: Configure Map cloned 1:1 from the real game — three translucent panels, label-above rows with arrow choices and number fields, real setting list only (no Ammo Limit / Petit / Hunter TPS / pool checkboxes), Filter + Body Type tiles, map list in the real order with green selection and ? for Random; Sugar Land name
- **2026-10-02** — Meccha Chameleon: remove invented Size/Body popup, hunters can't paint, nicer Body Type tiles, Credits describe the game and Tom Kodner's work, Update button for the Windows app
- **2026-10-02** — Meccha Chameleon: paint panel without the invented alpha slider and overwrite checkbox (opacity is only a mod in the real game); Body Type captions Default/Cube/Plump
- **2026-10-02** — Meccha Chameleon: translate Default body type
- **2026-10-02** — Meccha Chameleon: README, release folder (single-file game, Windows EXE with Update button, launcher source) and dev folder (build configs, map tools, QA scripts, modelling and research notes)


---

## 🚧 Known limitations and ideas for the future

- Maps are procedural; replacing props with high-quality 3D models (e.g. from Blender) would make them even more realistic.
- WebRTC multiplayer outside the artifact page needs the public PeerJS server to be reachable.
- The Update button needs this repository to be public (or a custom `update_url.txt`).
- Software-rendered environments run slowly; a real GPU is recommended.

---

## ❓ FAQ

**How do I become a hunter?** Stand on the red HUNTER pad in the lobby when the game starts.

**How do I start a game?** The host stands in front of the PLAY canvas in the lobby and presses E, then Start Game.

**How do I paint?** Press F. Hold Space to use the 3D Eyedropper, drag the right mouse button to change brush size.

**How do I pose?** Hold R to open the pose wheel and release on a pose.

**How do clones work?** Press Q to place a clone of yourself (up to two); X removes them.

**Can I play alone?** Yes — Create Server → Play Offline (with Bots).

**Can I play on my phone?** Yes, in landscape.

---

## 🙏 Credits and legal

- **Game design, direction and development of this remake: Tom Kodner.**
- This is a non-commercial **fan remake**. MECCHA CHAMELEON and its name, logo and original design belong to their
  respective owners. The paintings used in the maps are public-domain masterpieces.
- Built with React, TanStack Start, Tailwind CSS, Three.js, PeerJS and Go.
