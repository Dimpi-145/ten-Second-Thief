// World catalogue: theme, mission text and levels for each selectable environment.
//
// Map legend (see levels.js for the base set):
//  # wall  . floor  P start  E exit  K key  D/G loot  C obstacle  O pillar
//  V vault door (opens with the key)   T mission target   ~ void (fall = caught)
//  x electric trap tile   z zero-gravity floor   d/g/t = loot / target floating on zero-g floor
// Extra per-level data: pads (jump pads), platforms (moving platforms), spin lasers,
// guards with fly:true (drones) and a dev-only `route` used by check-levels.mjs.
import { LEVELS as MUSEUM_LEVELS } from './levels.js';

const S = 0;
const E = Math.PI / 2;
const N = Math.PI;
const W = -Math.PI / 2;

const BANK_LEVELS = [
  {
    name: 'Front Counter',
    map: [
      '#############',
      '#..G#GTG#G..#',
      '#...##V##...#',
      '#..........D#',
      '#...O...O...#',
      '#.C.K.....C.#',
      '#...........#',
      '#.G..C.C..G.#',
      '#E....P.....#',
      '#############',
    ],
    guards: [{ path: [[9, 3], [3, 3]], speed: 2.6, chase: 4.8 }],
    lasers: [{ a: [8, 6], b: [12, 6], type: 'blink', on: 1.1, off: 1.2, offset: 0 }],
    cameras: [{ pos: [11.4, 1], angle: W, sweep: 0.5, speed: 1.1 }],
  },
  {
    name: 'Deposit Hall',
    map: [
      '###############',
      '#D..#..G..#..D#',
      '#...#.....#...#',
      '#.............#',
      '#.O..CC.CC..O.#',
      '#.............#',
      '#G..#######..G#',
      '#...#G.T.G#...#',
      '#K..###V###...#',
      '#......P.....E#',
      '###############',
    ],
    guards: [
      { path: [[1, 5], [13, 5]], speed: 3, chase: 5 },
      { path: [[11, 7], [11, 3]], speed: 2.8, chase: 5 },
    ],
    lasers: [{ a: [0, 7], b: [4, 7], type: 'blink', on: 1.0, off: 1.2, offset: 1.0 }],
    cameras: [
      { pos: [7, 5.4], angle: N, sweep: 0.9, speed: 1.2 },
      { pos: [13.4, 7], angle: W, sweep: 0.5, speed: 1.3 },
    ],
  },
  {
    name: 'The Main Vault',
    map: [
      '###############',
      '#G...........G#',
      '#.O.........O.#',
      '#....C...C....#',
      '#####.....#####',
      '#.T.#.....#.D.#',
      '#...#..K..#...#',
      '#G..#.....#..G#',
      '##V##.....##V##',
      '#D...........D#',
      '#E.....P......#',
      '###############',
    ],
    guards: [
      { path: [[11, 9], [3, 9]], speed: 3.2, chase: 5.3 },
      { path: [[5, 5], [9, 5]], speed: 2.8, chase: 5.3 },
      { path: [[2, 1], [12, 1]], speed: 3, chase: 5.3 },
    ],
    lasers: [
      { a: [4, 8], b: [4, 11], type: 'blink', on: 0.9, off: 1.1, offset: 0.9 },
      { a: [4, 3], b: [10, 3], type: 'sweep', amp: 0.8, speed: 1.6, phase: 0 },
    ],
    cameras: [
      { pos: [4.6, 6], angle: E, sweep: 0.7, speed: 1.3 },
      { pos: [13.4, 10], angle: W, sweep: 0.4, speed: 1.2 },
    ],
  },
];

const CASINO_LEVELS = [
  {
    name: 'High Roller Floor',
    map: [
      '###########',
      '#G...E...G#',
      '#.........#',
      '#..C.T.C..#',
      '#.........#',
      '#.T..O..T.#',
      '#.........#',
      '#..C...C..#',
      '#D.......D#',
      '#....P....#',
      '###########',
    ],
    guards: [{ path: [[1, 6], [9, 6]], speed: 2.6, chase: 4.9 }],
    lasers: [{ type: 'spin', c: [5, 5], len: 3.4, speed: 1.3, phase: 0 }],
    cameras: [],
  },
  {
    name: 'Roulette Pit',
    map: [
      '###############',
      '#D.....E.....D#',
      '#.............#',
      '#...T.C.C.T...#',
      '#.............#',
      '#...O.....O...#',
      '#.............#',
      '#..G..C.C..G..#',
      '#......T......#',
      '#G.....P.....G#',
      '###############',
    ],
    guards: [
      { path: [[1, 6], [13, 6]], speed: 3, chase: 5.2 },
      { path: [[13, 2], [1, 2]], speed: 3, chase: 5.2 },
    ],
    lasers: [
      { type: 'spin', c: [4, 5], len: 2.6, speed: 1.5, phase: 0 },
      { type: 'spin', c: [10, 5], len: 2.6, speed: -1.5, phase: Math.PI },
    ],
    cameras: [{ pos: [0.6, 4], angle: E, sweep: 0.7, speed: 1.2 }],
  },
];

const ROOFTOP_LEVELS = [
  {
    name: 'Skyline Dash',
    map: [
      '###############',
      '#D....~~....E.#',
      '#.....~~......#',
      '#..C..~~..C...#',
      '#.....~~.....G#',
      '#K....~~......#',
      '#.....~~..O...#',
      '#..P..~~.....D#',
      '###############',
    ],
    guards: [
      { path: [[9, 2], [12, 2], [12, 6], [9, 6]], speed: 3, chase: 5, fly: true },
      { path: [[1, 2], [4, 2]], speed: 2.6, chase: 5, fly: true },
    ],
    lasers: [{ a: [8, 5], b: [11, 5], type: 'blink', on: 1.0, off: 1.2, offset: 0 }],
    cameras: [],
    pads: [
      { pos: [5, 4], dir: [1, 0], dist: 3 },
      { pos: [8, 6], dir: [-1, 0], dist: 3 },
    ],
    route: [[1, 5], [5, 4], [12, 1]],
  },
  {
    name: 'Antenna Row',
    map: [
      '#################',
      '#D...~~.G.~~...E#',
      '#....~~...~~....#',
      '#.C..~~.O.~~..C.#',
      '#....~~...~~....#',
      '#....~~.K.~~....#',
      '#.O..~~...~~..G.#',
      '#P...~~.D.~~...D#',
      '#################',
    ],
    guards: [
      { path: [[7, 1], [9, 1], [9, 7], [7, 7]], speed: 3.2, chase: 5.3, fly: true },
      { path: [[12, 4], [15, 4]], speed: 3, chase: 5.3, fly: true },
      { path: [[4, 1], [1, 1]], speed: 2.8, chase: 5.3, fly: true },
    ],
    lasers: [{ a: [11.5, 3], b: [15.5, 3], type: 'blink', on: 1.0, off: 1.0, offset: 0.5 }],
    cameras: [],
    pads: [
      { pos: [4, 4], dir: [1, 0], dist: 3 },
      { pos: [9, 2], dir: [1, 0], dist: 3 },
      { pos: [7, 6], dir: [-1, 0], dist: 3 },
      { pos: [12, 6], dir: [-1, 0], dist: 3 },
    ],
    route: [[1, 5], [4, 4], [8, 5], [9, 4], [9, 2], [15, 1]],
  },
];

const LAB_LEVELS = [
  {
    name: 'Test Chamber',
    map: [
      '#############',
      '#D....E....G#',
      '#...........#',
      '#~~~~~~~~~~~#',
      '#~~~~~~~~~~~#',
      '#.....x.....#',
      '#..T.x.x.T..#',
      '#.....x.....#',
      '#G..C...C..D#',
      '#.....P.....#',
      '#############',
    ],
    guards: [{ path: [[1, 2], [11, 2]], speed: 2.8, chase: 5 }],
    lasers: [],
    cameras: [],
    zap: { on: 0.9, off: 1.3 },
    platforms: [
      { a: [4, 4], b: [4, 3], speed: 2.4, phase: 0 },
      { a: [8, 4], b: [8, 3], speed: 2.4, phase: Math.PI },
    ],
    route: [[3, 6], [3, 7], [9, 7], [9, 6], [8, 5], [8, 4], [8, 2], [6, 1]],
  },
  {
    name: 'Reactor Walk',
    map: [
      '###############',
      '#G...........D#',
      '#......E......#',
      '#~~~~~~~~~~~~~#',
      '#~~~~~~~~~~~~~#',
      '#~~~~~~~~~~~~~#',
      '#....x...x....#',
      '#..xT..O..Tx..#',
      '#.............#',
      '#D.x...P...x.G#',
      '###############',
    ],
    guards: [
      { path: [[1, 8], [13, 8]], speed: 3, chase: 5.2 },
      { path: [[1, 1], [13, 1]], speed: 3, chase: 5.2 },
    ],
    lasers: [{ a: [0, 6], b: [3, 6], type: 'blink', on: 1.0, off: 1.2, offset: 0 }],
    cameras: [],
    zap: { on: 0.8, off: 1.2 },
    platforms: [
      { a: [3, 5], b: [3, 3], speed: 2, phase: 0 },
      { a: [7, 5], b: [7, 3], speed: 2, phase: 2 },
      { a: [11, 5], b: [11, 3], speed: 2, phase: 4 },
    ],
    route: [[4, 7], [4, 8], [10, 8], [10, 7], [7, 6], [7, 5], [7, 3], [7, 2]],
  },
];

const SPACE_LEVELS = [
  {
    name: 'Orbital Vault',
    map: [
      '###############',
      '#D.....E.....G#',
      '#.............#',
      '#..O.......O..#',
      '#...zzzzzzz...#',
      '#...dzztzzg...#',
      '#...zzzzzzz...#',
      '#..O.......O..#',
      '#.............#',
      '#G.....P.....D#',
      '###############',
    ],
    guards: [{ path: [[1, 2], [13, 2]], speed: 3, chase: 5.2 }],
    lasers: [
      { a: [5, 3.5], b: [5, 6.5], type: 'sweep', amp: 0.8, speed: 1.6, phase: 0 },
      { a: [9, 3.5], b: [9, 6.5], type: 'sweep', amp: 0.8, speed: 1.6, phase: Math.PI },
    ],
    cameras: [],
  },
  {
    name: 'Zero-G Core',
    map: [
      '#################',
      '#G......E......D#',
      '#...............#',
      '#.zzzzzzzzzzzzz.#',
      '#.zdzzOzzzOzzgz.#',
      '#.zzzzzztzzzzzz.#',
      '#.zzzzzzzzzzzzz.#',
      '#...............#',
      '#D..C...P...C..G#',
      '#################',
    ],
    guards: [
      { path: [[1, 2], [15, 2]], speed: 3.2, chase: 5.4 },
      { path: [[15, 7], [1, 7]], speed: 3.2, chase: 5.4 },
    ],
    lasers: [
      { type: 'spin', c: [6, 4], len: 2.3, speed: 1.6, phase: 0 },
      { type: 'spin', c: [10, 4], len: 2.3, speed: -1.6, phase: 1 },
    ],
    cameras: [{ pos: [0.6, 5], angle: E, sweep: 0.5, speed: 1.2 }],
  },
];

export const WORLDS = [
  {
    id: 'museum',
    name: 'Grand Museum',
    difficulty: 1,
    rank: 'ROOKIE',
    description: 'Marble halls, laser grids and priceless glass cases. The classic heist.',
    objective: 'Steal the gallery key and slip out through the exit.',
    steps: ['Find the gallery KEY', 'Reach the EXIT before the clock hits zero'],
    labels: { key: 'KEY', target: '', exit: 'EXIT' },
    levels: MUSEUM_LEVELS,
    theme: {
      bg: '#04050c',
      fog: ['#070818', 22, 58],
      ambient: ['#5560b8', 0.85],
      hemi: ['#6a7cff', '#12061f', 0.7],
      sun: ['#aab8ff', 1.5],
      lights: ['#00e5ff', '#b14dff'],
      lightPower: 55,
      wall: { color: '#1a2046', height: 3, rough: 0.62, metal: 0.25, trim: ['#00e5ff', '#b14dff'] },
      floor: { style: 'marble', rough: 0.32, metal: 0.45 },
      cliff: 1.5,
      backdrop: 'none',
      laser: ['#ff5a6e', '#ff0a2a'],
      guard: '#27408f',
      loot: { D: 'diamond', G: 'gold' },
      target: 'core',
      keyModel: 'key',
      exit: 'arch',
      accent: '#00e5ff',
      accent2: '#b14dff',
    },
  },
  {
    id: 'bank',
    name: 'Bank Vault',
    difficulty: 2,
    rank: 'PRO',
    description: 'Steel doors, sweeping cameras and stacks of cash. Crack the vault.',
    objective: 'Swipe the keycard, open the vault and take the bullion.',
    steps: ['Grab the KEYCARD', 'The VAULT DOOR opens — steal the BULLION', 'Escape through the EXIT'],
    labels: { key: 'KEYCARD', target: 'BULLION', exit: 'EXIT' },
    levels: BANK_LEVELS,
    theme: {
      bg: '#050807',
      fog: ['#0a1410', 24, 62],
      ambient: ['#b8c8a8', 0.75],
      hemi: ['#ffe9b0', '#0a1a12', 0.75],
      sun: ['#ffe6b8', 1.7],
      lights: ['#ffc531', '#3dffb0'],
      lightPower: 42,
      wall: { color: '#3d4f49', height: 3.2, rough: 0.45, metal: 0.55, trim: ['#ffc531', '#c9a13a'] },
      floor: { style: 'bank', rough: 0.28, metal: 0.4 },
      cliff: 1.5,
      backdrop: 'none',
      laser: ['#ff5a6e', '#ff0a2a'],
      guard: '#2b2f3a',
      loot: { D: 'diamond', G: 'cash' },
      target: 'bullion',
      keyModel: 'card',
      exit: 'arch',
      accent: '#ffc531',
      accent2: '#3dffb0',
    },
  },
  {
    id: 'casino',
    name: 'Neon Casino',
    difficulty: 3,
    rank: 'HIGH ROLLER',
    description: 'Slot machines, roulette pits and rotating laser sweeps under pink neon.',
    objective: 'Lift every golden chip from the floor, then cash out.',
    steps: ['Collect every GOLDEN CHIP', 'Dodge the ROTATING LASERS', 'Cash out at the EXIT'],
    labels: { key: 'KEY', target: 'GOLDEN CHIPS', exit: 'EXIT' },
    levels: CASINO_LEVELS,
    theme: {
      bg: '#0a0208',
      fog: ['#1a0412', 20, 56],
      ambient: ['#b05088', 0.8],
      hemi: ['#ff7ad0', '#1a0208', 0.7],
      sun: ['#ffd0e8', 1.2],
      lights: ['#ff2d95', '#ffb400'],
      lightPower: 60,
      wall: { color: '#3a0a22', height: 3, rough: 0.55, metal: 0.3, trim: ['#ff2d95', '#ffc531'] },
      floor: { style: 'carpet', rough: 0.75, metal: 0.05 },
      cliff: 1.5,
      backdrop: 'none',
      laser: ['#ff8a9a', '#ff0a2a'],
      guard: '#5a1030',
      loot: { D: 'diamond', G: 'chips' },
      target: 'chip',
      keyModel: 'key',
      exit: 'arch',
      accent: '#ff2d95',
      accent2: '#ffc531',
    },
  },
  {
    id: 'rooftop',
    name: 'City Rooftop',
    difficulty: 3,
    rank: 'DAREDEVIL',
    description: 'Leap between towers under a night skyline while patrol drones hunt you.',
    objective: 'Grab the access key and reach the helipad.',
    steps: ['Find the ACCESS KEY', 'Use JUMP PADS to cross the gaps', 'Reach the HELIPAD'],
    labels: { key: 'ACCESS KEY', target: '', exit: 'HELIPAD' },
    levels: ROOFTOP_LEVELS,
    theme: {
      bg: '#060b1c',
      fog: ['#0b1630', 34, 120],
      ambient: ['#6080c0', 0.9],
      hemi: ['#7090ff', '#0a0a14', 0.8],
      sun: ['#b8d0ff', 1.6],
      lights: ['#ff8a3d', '#3da8ff'],
      lightPower: 40,
      wall: { color: '#3a3f4d', height: 1, rough: 0.8, metal: 0.1, trim: ['#ff8a3d', '#ffb86b'] },
      floor: { style: 'roof', rough: 0.85, metal: 0.05 },
      cliff: 46,
      backdrop: 'city',
      laser: ['#ff5a6e', '#ff0a2a'],
      guard: '#27408f',
      loot: { D: 'diamond', G: 'gold' },
      target: 'core',
      keyModel: 'key',
      exit: 'helipad',
      accent: '#ff8a3d',
      accent2: '#3da8ff',
    },
  },
  {
    id: 'lab',
    name: 'Secret Laboratory',
    difficulty: 4,
    rank: 'EXPERT',
    description: 'Electric floor traps and moving platforms over a reactor pit.',
    objective: 'Hack both terminals, then ride a platform across the pit.',
    steps: ['Hack every TERMINAL', 'Time the ELECTRIC TRAPS', 'Ride a MOVING PLATFORM over the pit to the EXIT'],
    labels: { key: 'KEY', target: 'TERMINALS', exit: 'EXIT' },
    levels: LAB_LEVELS,
    theme: {
      bg: '#081012',
      fog: ['#0e1e1d', 26, 72],
      ambient: ['#d0fff4', 1.0],
      hemi: ['#e0fff8', '#103028', 0.9],
      sun: ['#f0fffa', 1.5],
      lights: ['#3dffb0', '#00d0ff'],
      lightPower: 38,
      wall: { color: '#b9c7cc', height: 3, rough: 0.35, metal: 0.2, trim: ['#3dffb0', '#00d0ff'] },
      floor: { style: 'lab', rough: 0.4, metal: 0.25 },
      cliff: 7,
      backdrop: 'pit',
      laser: ['#fff7b0', '#ffd21a'],
      guard: '#d9e2e6',
      loot: { D: 'diamond', G: 'gold' },
      target: 'terminal',
      keyModel: 'key',
      exit: 'arch',
      accent: '#3dffb0',
      accent2: '#00d0ff',
    },
  },
  {
    id: 'space',
    name: 'Space Vault',
    difficulty: 5,
    rank: 'LEGEND',
    description: 'An orbital strongroom where gravity fails and treasure floats.',
    objective: 'Drift through zero-g, steal the energy core and reach the airlock.',
    steps: ['Drift through the ZERO-G zone', 'Steal the ENERGY CORE', 'Reach the AIRLOCK'],
    labels: { key: 'KEY', target: 'ENERGY CORE', exit: 'AIRLOCK' },
    levels: SPACE_LEVELS,
    theme: {
      bg: '#020208',
      fog: ['#050514', 34, 110],
      ambient: ['#5060a0', 0.8],
      hemi: ['#6080ff', '#0a0418', 0.7],
      sun: ['#c0d0ff', 1.4],
      lights: ['#4d7cff', '#ff6a3d'],
      lightPower: 55,
      wall: { color: '#262c3e', height: 3, rough: 0.4, metal: 0.7, trim: ['#4d7cff', '#ff6a3d'] },
      floor: { style: 'space', rough: 0.35, metal: 0.7 },
      cliff: 1.2,
      backdrop: 'stars',
      laser: ['#e2a8ff', '#b030ff'],
      guard: '#8a94b0',
      loot: { D: 'crystal', G: 'gold' },
      target: 'core',
      keyModel: 'key',
      exit: 'arch',
      accent: '#4d7cff',
      accent2: '#ff6a3d',
    },
  },
];

WORLDS.forEach((w) => {
  w.theme.id = w.id;
});

// Number of levels that must be cleared in a world to unlock the next one.
export const UNLOCK_AFTER = 2;

// Human-readable hazard list for the mission briefing.
export function hazardsOf(level) {
  const out = [];
  const drones = level.guards.filter((g) => g.fly).length;
  const guards = level.guards.length - drones;
  const map = level.map.join('');
  const spin = level.lasers.filter((l) => l.type === 'spin').length;
  const beams = level.lasers.length - spin;
  if (guards) out.push(`${guards} guard${guards > 1 ? 's' : ''}`);
  if (drones) out.push(`${drones} patrol drone${drones > 1 ? 's' : ''}`);
  if (beams) out.push(`${beams} laser grid${beams > 1 ? 's' : ''}`);
  if (spin) out.push(`${spin} rotating laser${spin > 1 ? 's' : ''}`);
  if (level.cameras.length) out.push(`${level.cameras.length} camera${level.cameras.length > 1 ? 's' : ''}`);
  if (map.includes('V')) out.push('vault door');
  if (map.includes('x')) out.push('electric traps');
  if (level.platforms) out.push('moving platforms');
  if (level.pads) out.push('rooftop gaps');
  if (map.includes('z')) out.push('zero gravity');
  return out;
}
