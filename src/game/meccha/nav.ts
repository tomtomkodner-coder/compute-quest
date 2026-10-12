// רשת ניווט פשוטה + A* כדי שהשומרים ילכו מסביב לרהיטים ולא דרכם.
import type { Obstacle, World } from "./maps/kit";

export interface Nav {
  cell: number;
  cols: number;
  rows: number;
  ox: number;
  oz: number;
  blocked: Uint8Array;
  near: Uint8Array; // תא פנוי שצמוד למשהו (טוב למחבוא)
  find(ax: number, az: number, bx: number, bz: number): [number, number][] | null;
  free(x: number, z: number): boolean;
  randomFree(rand?: () => number): [number, number];
  toCell(x: number, z: number): [number, number];
  center(c: number, r: number): [number, number];
}

export function buildNav(world: World, radius = 0.45): Nav {
  const cell = 0.5;
  const { minX, maxX, minZ, maxZ } = world.bounds;
  const ox = minX;
  const oz = minZ;
  const cols = Math.ceil((maxX - minX) / cell);
  const rows = Math.ceil((maxZ - minZ) / cell);
  const blocked = new Uint8Array(cols * rows);
  const near = new Uint8Array(cols * rows);
  const hits = (o: Obstacle, x: number, z: number, r: number) =>
    o.enabled !== false && o.top > 0.46 && o.bottom < 1.6 && x > o.minX - r && x < o.maxX + r && z > o.minZ - r && z < o.maxZ + r;

  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = ox + (c + 0.5) * cell;
      const z = oz + (r + 0.5) * cell;
      const i = r * cols + c;
      if (x < minX + radius || x > maxX - radius || z < minZ + radius || z > maxZ - radius) blocked[i] = 1;
      else if (world.obstacles.some((o) => hits(o, x, z, radius))) blocked[i] = 1;
      else if (world.obstacles.some((o) => hits(o, x, z, radius + 0.7)) || x < minX + 1.2 || x > maxX - 1.2 || z < minZ + 1.2 || z > maxZ - 1.2)
        near[i] = 1;
    }

  const toCell = (x: number, z: number): [number, number] => [
    Math.max(0, Math.min(cols - 1, Math.floor((x - ox) / cell))),
    Math.max(0, Math.min(rows - 1, Math.floor((z - oz) / cell))),
  ];
  const center = (c: number, r: number): [number, number] => [ox + (c + 0.5) * cell, oz + (r + 0.5) * cell];
  const free = (x: number, z: number) => {
    const [c, r] = toCell(x, z);
    return !blocked[r * cols + c];
  };

  function nearestFree(c: number, r: number): [number, number] {
    if (!blocked[r * cols + c]) return [c, r];
    for (let d = 1; d < 8; d++)
      for (let dr = -d; dr <= d; dr++)
        for (let dc = -d; dc <= d; dc++) {
          const cc = c + dc;
          const rr = r + dr;
          if (cc >= 0 && rr >= 0 && cc < cols && rr < rows && !blocked[rr * cols + cc]) return [cc, rr];
        }
    return [c, r];
  }

  function find(ax: number, az: number, bx: number, bz: number) {
    const [sc, sr] = nearestFree(...toCell(ax, az));
    const [ec, er] = nearestFree(...toCell(bx, bz));
    const N = cols * rows;
    const g = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const start = sr * cols + sc;
    const goal = er * cols + ec;
    g[start] = 0;
    // תור עדיפויות בינארי
    const heap: [number, number][] = [[0, start]];
    const push = (f: number, i: number) => {
      heap.push([f, i]);
      let k = heap.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heap[p][0] <= heap[k][0]) break;
        [heap[p], heap[k]] = [heap[k], heap[p]];
        k = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const l = k * 2 + 1;
          const r = l + 1;
          let m = k;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k], heap[m]];
          k = m;
        }
      }
      return top;
    };
    const h = (i: number) => Math.hypot((i % cols) - ec, Math.floor(i / cols) - er);
    while (heap.length) {
      const [, cur] = pop();
      if (cur === goal) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cc = cur % cols;
      const cr = Math.floor(cur / cols);
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nc = cc + dc;
          const nr = cr + dr;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
          const ni = nr * cols + nc;
          if (blocked[ni] || closed[ni]) continue;
          if (dr && dc && (blocked[cr * cols + nc] || blocked[nr * cols + cc])) continue; // לא חותכים פינות
          const ng = g[cur] + (dr && dc ? 1.414 : 1);
          if (ng < g[ni]) {
            g[ni] = ng;
            came[ni] = cur;
            push(ng + h(ni), ni);
          }
        }
    }
    if (came[goal] === -1 && goal !== start) return null;
    const path: [number, number][] = [];
    for (let i = goal; i !== -1 && i !== start; i = came[i]) path.push(center(i % cols, Math.floor(i / cols)));
    path.reverse();
    // החלקת מסלול: מדלגים על נקודות כשיש קו ישיר
    const smooth: [number, number][] = [];
    let from: [number, number] = [ax, az];
    for (let i = 0; i < path.length; i++) {
      const next = path[i + 1];
      if (next && lineFree(from, next)) continue;
      smooth.push(path[i]);
      from = path[i];
    }
    return smooth;
  }

  function lineFree(a: [number, number], b: [number, number]) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.ceil(d / (cell * 0.5));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!free(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false;
    }
    return true;
  }

  function randomFree(rand = Math.random): [number, number] {
    for (let k = 0; k < 500; k++) {
      const c = Math.floor(rand() * cols);
      const r = Math.floor(rand() * rows);
      if (!blocked[r * cols + c]) return center(c, r);
    }
    return [0, 0];
  }

  return { cell, cols, rows, ox, oz, blocked, near, find, free, randomFree, toCell, center };
}
