import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
const q = new URLSearchParams(location.search);
const r = new THREE.WebGLRenderer({ antialias: true });
r.setSize(1500, 520);
r.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(r.domElement);
const pm = new THREE.PMREMGenerator(r);
const sc = new THREE.Scene();
sc.background = new THREE.Color("#6b7280");
sc.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
sc.environmentIntensity = 0.6;
const d = new THREE.DirectionalLight("#fff", 1.6); d.position.set(3, 5, 4); sc.add(d);
const gl = await new GLTFLoader().loadAsync("./" + (q.get("m") || "normal") + ".glb");
const poses: Record<string, Record<string, [number, number, number]>> = {
  rest: {},
  stand: { shL: [0, 0, 0.1], shR: [0, 0, -0.1] },
  spread: { shL: [0, 0, 2.2], shR: [0, 0, -2.2], hipL: [0, 0, 0.5], hipR: [0, 0, -0.5] },
  sit: { hipL: [-1.5, 0, 0.1], hipR: [-1.5, 0, -0.1], shL: [-0.3, 0, 0.3], shR: [-0.3, 0, -0.3], elL: [-0.3, 0, 0], elR: [-0.3, 0, 0], knL: [1.5, 0, 0], knR: [1.5, 0, 0] },
  cactus: { shL: [0, 0, 1.55], shR: [0, 0, -1.55], elL: [0, 0, -1.6], elR: [0, 0, 1.6] },
  squat: { hipL: [-1.9, 0, 0.35], hipR: [-1.9, 0, -0.35], knL: [2.4, 0, 0], knR: [2.4, 0, 0], shL: [-1.35, 0, 0.1], shR: [-1.35, 0, -0.1] },
  lump: { head: [0.7, 0, 0], hipL: [-2.3, 0, 0.1], hipR: [-2.3, 0, -0.1], knL: [2.3, 0, 0], knR: [2.3, 0, 0], shL: [-1.8, 0, 0.3], shR: [-1.8, 0, -0.3], elL: [-1.4, 0, 0], elR: [-1.4, 0, 0] },
};
const names = Object.keys(poses);
const cams: THREE.PerspectiveCamera[] = [];
let i = 0;
for (const n of names) {
  const root = (i === 0 ? gl.scene : (await new GLTFLoader().loadAsync("./" + (q.get("m") || "normal") + ".glb")).scene);
  root.position.x = (i - (names.length - 1) / 2) * 1.6;
  sc.add(root);
  let sk: THREE.SkinnedMesh | null = null;
  root.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) sk = o as THREE.SkinnedMesh; });
  const mesh = sk! as THREE.SkinnedMesh;
  mesh.material = new THREE.MeshStandardMaterial({ color: "#f4f4f4", roughness: 0.8 });
  root.updateMatrixWorld(true);
  const bones = mesh.skeleton.bones;
  const restW = new Map<string, THREE.Quaternion>();
  for (const b of bones) restW.set(b.name, b.getWorldQuaternion(new THREE.Quaternion()));
  const rootQ = root.getWorldQuaternion(new THREE.Quaternion());
  const A = (45 * Math.PI) / 180, LA = (7 * Math.PI) / 180;
  const Dz = (ang: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), ang);
  const D: Record<string, THREE.Quaternion> = { shL: Dz(-A), elL: Dz(-A), shR: Dz(A), elR: Dz(A), hipL: Dz(-LA), knL: Dz(-LA), hipR: Dz(LA), knR: Dz(LA) };
  const ref = (name: string) => (D[name] ? D[name].clone().multiply(restW.get(name)!) : restW.get(name)!.clone());
  for (const b of bones) {
    const e = poses[n][b.name];
    const R = e ? new THREE.Quaternion().setFromEuler(new THREE.Euler(...e)) : new THREE.Quaternion();
    const Wp = b.parent && restW.has(b.parent.name) ? ref(b.parent.name) : rootQ;
    b.quaternion.copy(Wp.clone().invert().multiply(R).multiply(ref(b.name)));
  }
  i++;
}
const cam = new THREE.PerspectiveCamera(30, 1500 / 520, 0.1, 50);
cam.position.set(0.6, 1.3, 8.5); cam.lookAt(0, 0.9, 0);
r.render(sc, cam);
(window as unknown as { done: boolean }).done = true;
