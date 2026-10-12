import { Engine } from "../src/game/meccha/engine";
import { createLocalNet } from "../src/game/meccha/net";
import { loadCharacterModels } from "../src/game/meccha/character";
import { loadPaintings } from "../src/game/meccha/paintings";
await loadPaintings();
await loadCharacterModels();
(window as unknown as { __mecchaHQ: boolean }).__mecchaHQ = true;
const e = new Engine(document.getElementById("app")!, createLocalNet(), { name: "Tester", color: "#3a86ff", muted: true, defaultBots: 0, onHud: () => {} });
(window as unknown as { __meccha: Engine }).__meccha = e;
