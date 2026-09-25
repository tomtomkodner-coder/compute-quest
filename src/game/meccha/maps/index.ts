import type { World } from "./kit";
import { buildLobby } from "./lobby";
import { buildMansion } from "./mansion";
import { buildCountry } from "./country";
import { buildSewer } from "./sewer";
import { buildBackrooms } from "./backrooms";
import { buildPenguin } from "./penguin";
import { buildSugarland } from "./sugarland";
import { buildOsaka } from "./osaka";
import { buildEgypt } from "./egypt";
import { buildDeathBurger } from "./deathburger";
import { buildGreece } from "./greece";
import { buildDeepSea } from "./deepsea";
import { buildMall } from "./mall";
import { buildKyoto } from "./kyoto";
import { buildMuseum } from "./museum";
import { buildGallery } from "./gallery";
import { buildColdStorage } from "./coldstorage";
import { buildBrickLoft } from "./brickloft";
import { buildPool } from "./pool";
import { buildSakura } from "./sakura";
import { buildMeeting } from "./meeting";
import { buildSchool } from "./school";
import { buildAmusement } from "./amusement";
import { buildOnsen } from "./onsen";

export type { World, Obstacle, Lighting } from "./kit";

// סדר המפות = סדר ההוספה במשחק המקורי (מפות שיתופי פעולה עם גורמים חיצוניים לא שוכפלו)
export const MAPS: { id: string; name: string; build: () => World }[] = [
  { id: "mansion", name: "Hide-and-Seek Mansion", build: buildMansion },
  { id: "country", name: "Indoor Country", build: buildCountry },
  { id: "sewer", name: "Sewer", build: buildSewer },
  { id: "backrooms", name: "Backrooms", build: buildBackrooms },
  { id: "penguin", name: "Penguin Hotel", build: buildPenguin },
  { id: "sugarland", name: "Sugarland", build: buildSugarland },
  { id: "osaka", name: "Osaka", build: buildOsaka },
  { id: "egypt", name: "Egypt", build: buildEgypt },
  { id: "deathburger", name: "Death Burger", build: buildDeathBurger },
  { id: "greece", name: "Greece", build: buildGreece },
  { id: "deepsea", name: "Deep Sea", build: buildDeepSea },
  { id: "mall", name: "Shopping Mall", build: buildMall },
  { id: "kyoto", name: "Kyoto", build: buildKyoto },
  { id: "museum", name: "Art Museum", build: buildMuseum },
  // מפות סדנת Steam (Workshop) פופולריות
  { id: "gallery", name: "Art Gallery", build: buildGallery },
  { id: "coldstorage", name: "Cold Storage", build: buildColdStorage },
  { id: "brickloft", name: "Brick Loft", build: buildBrickLoft },
  { id: "pool", name: "Swimming Pool", build: buildPool },
  { id: "sakura", name: "Cherry Blossom Garden", build: buildSakura },
  { id: "meeting", name: "Meeting Room", build: buildMeeting },
  // מפות נוספות (בקשת המשתמש)
  { id: "school", name: "School", build: buildSchool },
  { id: "amusement", name: "Amusement Park", build: buildAmusement },
  { id: "onsen", name: "Hot Spring Inn", build: buildOnsen },
];

export function buildMap(id: string): World {
  if (id === "lobby") return buildLobby();
  return (MAPS.find((m) => m.id === id) ?? MAPS[0]).build();
}
