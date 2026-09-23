import type { World } from "./kit";
import { buildLobby } from "./lobby";
import { buildMansion } from "./mansion";
import { buildBackrooms } from "./backrooms";
import { buildCountry } from "./country";
import { buildSewer } from "./sewer";
import { buildPenguin } from "./penguin";
import { buildSugarland } from "./sugarland";
import { buildOsaka } from "./osaka";

export type { World, Obstacle, Lighting } from "./kit";

export const MAPS: { id: string; name: string; build: () => World }[] = [
  { id: "mansion", name: "Hide-and-Seek Mansion", build: buildMansion },
  { id: "country", name: "Indoor Country", build: buildCountry },
  { id: "sewer", name: "Sewer", build: buildSewer },
  { id: "backrooms", name: "Backrooms", build: buildBackrooms },
  { id: "penguin", name: "Penguin Hotel", build: buildPenguin },
  { id: "sugarland", name: "Sugarland", build: buildSugarland },
  { id: "osaka", name: "Osaka", build: buildOsaka },
];

export function buildMap(id: string): World {
  if (id === "lobby") return buildLobby();
  return (MAPS.find((m) => m.id === id) ?? MAPS[0]).build();
}
