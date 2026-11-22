import { LEVEL_TIME, SMOKE_CHARGES } from './levels.js';
import { WORLDS } from './worlds.js';

export const TILE = 2;
export const WALL = 1;
export const PILLAR = 2;
export const CASE = 3;
export const VOID = 4; // open pit / rooftop gap: the player can step in (and fall), guards cannot
export const DOOR = 5; // vault door: solid until the key is collected
// Half extents of solid obstacles by cell type.
const HALF = [0, 1, 0.55, 0.72, 1, 1];
export const PLATFORM_HALF = 0.95;

export function createWorld(worldIndex, levelIndex) {
  const meta = WORLDS[worldIndex];
  const def = meta.levels[levelIndex];
  const rows = def.map.length;
  const cols = def.map[0].length;
  const grid = new Uint8Array(cols * rows);
  const zero = new Uint8Array(cols * rows);
  const toX = (c) => (c - cols / 2 + 0.5) * TILE;
  const toZ = (r) => (r - rows / 2 + 0.5) * TILE;

  const world = {
    worldIndex,
    levelIndex,
    meta,
    theme: meta.theme,
    def,
    cols,
    rows,
    grid,
    zero,
    toX,
    toZ,
    width: cols * TILE,
    depth: rows * TILE,
    t: 0,
    timeLeft: LEVEL_TIME,
    over: false,
    fell: false,
    hasKey: false,
    exitOpen: false,
    targetsLeft: 0,
    alarm: 0,
    smokeT: 0,
    smokeCharges: SMOKE_CHARGES,
    lockedMsgT: 0,
    items: [],
    targets: [],
    doors: [],
    zaps: [],
    zeroCells: [],
    key: null,
    exit: null,
    walls: [],
    pillars: [],
    cases: [],
    hasVoid: false,
    player: {
      x: 0, z: 0, y: 0, vx: 0, vz: 0, angle: Math.PI, speed: 0, walk: 0,
      hidden: false, jump: null, float: 0,
    },
    guards: [],
    lasers: [],
    cameras: [],
    pads: [],
    platforms: [],
    dist: new Int16Array(cols * rows),
    queue: new Int16Array(cols * rows),
  };

  const zap = def.zap || { on: 1, off: 1.2 };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let ch = def.map[r][c];
      const x = toX(c);
      const z = toZ(r);
      const i = r * cols + c;
      // lower-case letters are the same entity sitting on a zero-gravity floor tile
      const floating = ch === 'z' || ch === 'd' || ch === 'g' || ch === 't';
      if (floating) {
        zero[i] = 1;
        world.zeroCells.push({ x, z });
        ch = ch === 'z' ? '.' : ch.toUpperCase();
      }
      if (ch === '#') {
        grid[i] = WALL;
        world.walls.push({ x, z, c, r });
      } else if (ch === 'O') {
        grid[i] = PILLAR;
        world.pillars.push({ x, z });
      } else if (ch === 'C') {
        grid[i] = CASE;
        world.cases.push({ x, z, seed: c * 7 + r * 13 });
      } else if (ch === '~') {
        grid[i] = VOID;
        world.hasVoid = true;
      } else if (ch === 'V') {
        grid[i] = DOOR;
        const horizontal = c > 0 && c < cols - 1 && def.map[r][c - 1] === '#' && def.map[r][c + 1] === '#';
        world.doors.push({ x, z, c, r, open: false, horizontal });
      } else if (ch === 'x') {
        world.zaps.push({ x, z, phase: ((c + r) % 2) * ((zap.on + zap.off) / 2), on: zap.on, off: zap.off, active: false, warn: false });
      } else if (ch === 'P') {
        world.player.x = x;
        world.player.z = z;
      } else if (ch === 'E') {
        world.exit = { x, z, c, r };
      } else if (ch === 'K') {
        world.key = { x, z, collected: false };
      } else if (ch === 'T') {
        world.targets.push({ x, z, collected: false, zero: floating });
      } else if (ch === 'D' || ch === 'G') {
        world.items.push({ kind: ch, x, z, collected: false, zero: floating, phase: (c * 3 + r * 5) % 7 });
      }
    }
  }
  world.targetsLeft = world.targets.length;
  world.exitOpen = !world.key && !world.targetsLeft;

  world.guards = def.guards.map((g) => {
    const path = g.path.map(([c, r]) => ({ x: toX(c), z: toZ(r) }));
    const dx = path[1].x - path[0].x;
    const dz = path[1].z - path[0].z;
    return {
      path,
      idx: 1,
      x: path[0].x,
      z: path[0].z,
      angle: Math.atan2(dx, dz),
      speed: g.speed,
      chaseSpeed: g.chase,
      fly: !!g.fly,
      state: 'patrol',
      alert: 0,
      lose: 0,
      lastX: 0,
      lastZ: 0,
      walk: 0,
      moving: 0,
    };
  });

  world.lasers = def.lasers.map((l) => {
    if (l.type === 'spin') {
      const cx = toX(l.c[0]);
      const cz = toZ(l.c[1]);
      return { ...l, cx, cz, ax: cx, az: cz, bx: cx, bz: cz, len: l.len * TILE, active: true, warn: false };
    }
    const ax = toX(l.a[0]);
    const az = toZ(l.a[1]);
    const bx = toX(l.b[0]);
    const bz = toZ(l.b[1]);
    const len = Math.hypot(bx - ax, bz - az);
    return {
      ...l,
      ax0: ax,
      az0: az,
      bx0: bx,
      bz0: bz,
      ax,
      az,
      bx,
      bz,
      len,
      nx: -(bz - az) / len,
      nz: (bx - ax) / len,
      active: true,
      warn: false,
    };
  });

  world.cameras = def.cameras.map((c) => ({
    x: toX(c.pos[0]),
    z: toZ(c.pos[1]),
    base: c.angle,
    sweep: c.sweep,
    speed: c.speed,
    angle: c.angle,
    detect: 0,
    seeing: false,
  }));

  world.pads = (def.pads || []).map((p) => ({
    x: toX(p.pos[0]),
    z: toZ(p.pos[1]),
    dx: p.dir[0],
    dz: p.dir[1],
    tx: toX(p.pos[0] + p.dir[0] * p.dist),
    tz: toZ(p.pos[1] + p.dir[1] * p.dist),
  }));

  world.platforms = (def.platforms || []).map((p) => ({
    ax: toX(p.a[0]),
    az: toZ(p.a[1]),
    bx: toX(p.b[0]),
    bz: toZ(p.b[1]),
    speed: p.speed,
    phase: p.phase || 0,
    x: 0,
    z: 0,
    mx: 0,
    mz: 0,
  }));

  updateLasers(world);
  updatePlatforms(world);
  updateZaps(world);
  return world;
}

export function cellAt(world, x, z) {
  const c = Math.floor(x / TILE + world.cols / 2);
  const r = Math.floor(z / TILE + world.rows / 2);
  return { c, r };
}

export function cellType(world, c, r) {
  if (c < 0 || r < 0 || c >= world.cols || r >= world.rows) return WALL;
  return world.grid[r * world.cols + c];
}

export function isZeroG(world, x, z) {
  const { c, r } = cellAt(world, x, z);
  if (c < 0 || r < 0 || c >= world.cols || r >= world.rows) return false;
  return world.zero[r * world.cols + c] === 1;
}

// Circle vs. grid obstacles: move, then push out of any overlapping boxes.
// Void cells only block entities that cannot fall (voidSolid = true, i.e. guards).
export function moveCircle(world, ent, dx, dz, radius, voidSolid = true) {
  ent.x += dx;
  ent.z += dz;
  const { c: cc, r: cr } = cellAt(world, ent.x, ent.z);
  for (let pass = 0; pass < 2; pass++) {
    for (let r = cr - 1; r <= cr + 1; r++) {
      for (let c = cc - 1; c <= cc + 1; c++) {
        const t = cellType(world, c, r);
        if (!t || (t === VOID && !voidSolid)) continue;
        const h = HALF[t];
        const bx = world.toX(c);
        const bz = world.toZ(r);
        const px = Math.max(bx - h, Math.min(ent.x, bx + h));
        const pz = Math.max(bz - h, Math.min(ent.z, bz + h));
        let ox = ent.x - px;
        let oz = ent.z - pz;
        const d2 = ox * ox + oz * oz;
        if (d2 >= radius * radius) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          const push = radius - d;
          ent.x += (ox / d) * push;
          ent.z += (oz / d) * push;
        } else {
          // Centre is inside the box: push out along the shallowest axis.
          ox = ent.x - bx;
          oz = ent.z - bz;
          if (Math.abs(ox) > Math.abs(oz)) ent.x = bx + Math.sign(ox || 1) * (h + radius);
          else ent.z = bz + Math.sign(oz || 1) * (h + radius);
        }
      }
    }
  }
}

function pointSolid(world, x, z) {
  const { c, r } = cellAt(world, x, z);
  const t = cellType(world, c, r);
  if (!t || t === VOID) return false;
  if (t === WALL || t === DOOR) return true;
  const h = HALF[t];
  return Math.abs(x - world.toX(c)) < h && Math.abs(z - world.toZ(r)) < h;
}

export function lineOfSight(world, x0, z0, x1, z1) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const d = Math.hypot(dx, dz);
  const steps = Math.ceil(d / 0.35);
  for (let i = 1; i < steps; i++) {
    const f = i / steps;
    if (pointSolid(world, x0 + dx * f, z0 + dz * f)) return false;
  }
  return true;
}

const NB = [1, 0, -1, 0, 0, 1, 0, -1];

// Breadth-first search outward from the target; writes the centre of the next
// cell to step to from (fx, fz) into `out`. Returns false when no route exists.
export function nextStep(world, fx, fz, tx, tz, out) {
  const { cols, rows, dist, queue, grid } = world;
  const from = cellAt(world, fx, fz);
  const to = cellAt(world, tx, tz);
  if (from.c === to.c && from.r === to.r) {
    out.x = tx;
    out.z = tz;
    return true;
  }
  if (cellType(world, to.c, to.r) || cellType(world, from.c, from.r)) return false;
  dist.fill(-1);
  let head = 0;
  let tail = 0;
  const start = to.r * cols + to.c;
  const goal = from.r * cols + from.c;
  dist[start] = 0;
  queue[tail++] = start;
  while (head < tail) {
    const cur = queue[head++];
    if (cur === goal) break;
    const c = cur % cols;
    const r = (cur - c) / cols;
    for (let k = 0; k < 8; k += 2) {
      const nc = c + NB[k];
      const nr = r + NB[k + 1];
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const ni = nr * cols + nc;
      if (grid[ni] || dist[ni] >= 0) continue;
      dist[ni] = dist[cur] + 1;
      queue[tail++] = ni;
    }
  }
  if (dist[goal] < 0) return false;
  let best = -1;
  let bestD = dist[goal];
  for (let k = 0; k < 8; k += 2) {
    const nc = from.c + NB[k];
    const nr = from.r + NB[k + 1];
    if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
    const ni = nr * cols + nc;
    if (dist[ni] >= 0 && dist[ni] < bestD) {
      bestD = dist[ni];
      best = ni;
    }
  }
  if (best < 0) return false;
  const bc = best % cols;
  out.x = world.toX(bc);
  out.z = world.toZ((best - bc) / cols);
  return true;
}

export function updateLasers(world) {
  const t = world.t;
  for (const l of world.lasers) {
    if (l.type === 'blink') {
      const cycle = l.on + l.off;
      const ph = (t + (l.offset || 0)) % cycle;
      l.active = ph < l.on;
      l.warn = !l.active && ph > cycle - 0.35;
    } else if (l.type === 'sweep') {
      const o = Math.sin(t * l.speed + (l.phase || 0)) * l.amp * TILE;
      l.ax = l.ax0 + l.nx * o;
      l.az = l.az0 + l.nz * o;
      l.bx = l.bx0 + l.nx * o;
      l.bz = l.bz0 + l.nz * o;
    } else if (l.type === 'spin') {
      const a = t * l.speed + (l.phase || 0);
      // beam starts just outside the pivot pillar
      l.ax = l.cx + Math.cos(a) * 0.6;
      l.az = l.cz + Math.sin(a) * 0.6;
      l.bx = l.cx + Math.cos(a) * l.len;
      l.bz = l.cz + Math.sin(a) * l.len;
    }
  }
}

export function updatePlatforms(world) {
  for (const p of world.platforms) {
    const f = 0.5 - 0.5 * Math.cos(world.t * p.speed + p.phase);
    const nx = p.ax + (p.bx - p.ax) * f;
    const nz = p.az + (p.bz - p.az) * f;
    p.mx = nx - p.x;
    p.mz = nz - p.z;
    p.x = nx;
    p.z = nz;
  }
}

export function updateZaps(world) {
  for (const z of world.zaps) {
    const cycle = z.on + z.off;
    const ph = (world.t + z.phase) % cycle;
    z.active = ph < z.on;
    z.warn = !z.active && ph > cycle - 0.4;
  }
}

export function platformAt(world, x, z, tol = 0) {
  for (const p of world.platforms) {
    if (Math.abs(x - p.x) < PLATFORM_HALF + tol && Math.abs(z - p.z) < PLATFORM_HALF + tol) return p;
  }
  return null;
}

// True when the point is over walkable ground (solid floor or a platform).
export function supported(world, x, z, tol = 0.45) {
  const { c, r } = cellAt(world, x, z);
  return cellType(world, c, r) !== VOID || !!platformAt(world, x, z, tol);
}

export function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let f = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  f = Math.max(0, Math.min(1, f));
  return Math.hypot(px - (ax + dx * f), pz - (az + dz * f));
}
