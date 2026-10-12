// סביבות HDR אמיתיות (צילומי 360° ברישיון CC0 מ־@pmndrs/assets) — תאורה והשתקפויות מציאותיות לכל מפה.
import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

export type HdriName =
  | "apartment" | "bridge" | "city" | "dawn" | "esplanade" | "forest" | "hall" | "lab" | "lobby"
  | "night" | "park" | "sky" | "studio" | "sunrise" | "sunset" | "venice" | "warehouse" | "workshop";

const SRC: Record<HdriName, () => Promise<{ default: string }>> = {
  apartment: () => import("@pmndrs/assets/hdri/apartment.exr"),
  bridge: () => import("@pmndrs/assets/hdri/bridge.exr"),
  city: () => import("@pmndrs/assets/hdri/city.exr"),
  dawn: () => import("@pmndrs/assets/hdri/dawn.exr"),
  esplanade: () => import("@pmndrs/assets/hdri/esplanade.exr"),
  forest: () => import("@pmndrs/assets/hdri/forest.exr"),
  hall: () => import("@pmndrs/assets/hdri/hall.exr"),
  lab: () => import("@pmndrs/assets/hdri/lab.exr"),
  lobby: () => import("@pmndrs/assets/hdri/lobby.exr"),
  night: () => import("@pmndrs/assets/hdri/night.exr"),
  park: () => import("@pmndrs/assets/hdri/park.exr"),
  sky: () => import("@pmndrs/assets/hdri/sky.exr"),
  studio: () => import("@pmndrs/assets/hdri/studio.exr"),
  sunrise: () => import("@pmndrs/assets/hdri/sunrise.exr"),
  sunset: () => import("@pmndrs/assets/hdri/sunset.exr"),
  venice: () => import("@pmndrs/assets/hdri/venice.exr"),
  warehouse: () => import("@pmndrs/assets/hdri/warehouse.exr"),
  workshop: () => import("@pmndrs/assets/hdri/workshop.exr"),
};

const cache = new Map<HdriName, Promise<THREE.DataTexture>>();

export function loadHdri(name: HdriName): Promise<THREE.DataTexture> {
  let p = cache.get(name);
  if (!p) {
    p = SRC[name]().then(async (m) => {
      const tex = await new EXRLoader().setDataType(THREE.HalfFloatType).loadAsync(m.default);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      return tex;
    });
    p.catch(() => cache.delete(name));
    cache.set(name, p);
  }
  return p;
}
