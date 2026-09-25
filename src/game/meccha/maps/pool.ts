// Swimming Pool (Steam Workshop map) — placeholder until the full model is built.
import * as T from "../textures";
import { Kit, grid, type World } from "./kit";

export function buildPool(): World {
  const k = new Kit(6, 3);
  const wall = k.mat(k.tex("poolWall", () => T.noise("#d8d2c4", 0.06, 3)), "#fff");
  k.floor(-12, 12, -12, 12, k.mat(k.tex("poolFloor", () => T.concrete("#9a958a", 3)), "#fff"), 3);
  k.wallX(-12, -12, 12, wall);
  k.wallX(12, -12, 12, wall);
  k.wallZ(-12, -12, 12, wall);
  k.wallZ(12, -12, 12, wall);
  return k.finish({
    id: "pool", name: "Swimming Pool",
    bounds: { minX: -11.8, maxX: 11.8, minZ: -11.8, maxZ: 11.8 },
    hunterSpawns: grid(0, 9, 9), hiderSpawns: grid(0, -6, 24),
    lighting: { sky: "#cfd8e0", hemi: ["#ffffff", "#8a8070", 1.1], sun: { color: "#fff4e0", int: 1.5, pos: [-8, 20, 6] }, points: [] },
  });
}
