// Map legend:
//  # wall   . floor   P player start   E exit   K key
//  D diamond (+100)   G gold (+50)   C display case (solid)   O pillar (solid)
// Guard paths, lasers and cameras use [col, row] tile coordinates (floats allowed).
// Angles: 0 = south (+z), PI/2 = east, PI = north, -PI/2 = west.

const S = 0;
const E = Math.PI / 2;
const W = -Math.PI / 2;

export const LEVELS = [
  {
    name: 'The Lobby',
    map: [
      '###########',
      '#....E....#',
      '#.O.....O.#',
      '#..D...G..#',
      '#.........#',
      '#.C..K..C.#',
      '#.........#',
      '#..G...D..#',
      '#.O.....O.#',
      '#....P....#',
      '###########',
    ],
    guards: [{ path: [[5, 3], [9, 3], [5, 3], [1, 3]], speed: 2.4, chase: 4.6 }],
    lasers: [
      { a: [0, 6], b: [3, 6], type: 'static' },
      { a: [7, 6], b: [10, 6], type: 'static' },
    ],
    cameras: [],
  },
  {
    name: 'Gallery of Glass',
    map: [
      '#############',
      '#.....E.....#',
      '#.O.......O.#',
      '#..D..C..D..#',
      '#...........#',
      '###.#####.###',
      '#K.........G#',
      '#..C..O..C..#',
      '#.G.......D.#',
      '#.....P.....#',
      '#############',
    ],
    guards: [
      { path: [[1, 4], [11, 4]], speed: 3, chase: 4.9 },
      { path: [[9, 6], [3, 6]], speed: 2.6, chase: 4.9 },
    ],
    lasers: [
      { a: [8, 5], b: [10, 5], type: 'blink', on: 1.1, off: 1.1, offset: 0 },
      { a: [5, 2], b: [7, 2], type: 'static' },
    ],
    cameras: [{ pos: [6, 5.6], angle: S, sweep: 0.9, speed: 1.1 }],
  },
  {
    name: 'Laser Hall',
    map: [
      '###############',
      '#......E......#',
      '#.O....#....O.#',
      '#..D...#...D..#',
      '#......#......#',
      '#.C..G...G..C.#',
      '####.......####',
      '#K...O...O...G#',
      '#.............#',
      '#.D..C...C..D.#',
      '#......P......#',
      '###############',
    ],
    guards: [
      { path: [[1, 4], [5, 4]], speed: 2.8, chase: 5.1 },
      { path: [[13, 4], [9, 4]], speed: 2.8, chase: 5.1 },
      { path: [[12, 8], [2, 8]], speed: 3.2, chase: 5.1 },
    ],
    lasers: [
      { a: [3, 6], b: [7, 6], type: 'blink', on: 1.2, off: 1.2, offset: 0 },
      { a: [7, 6], b: [11, 6], type: 'blink', on: 1.2, off: 1.2, offset: 1.2 },
      { a: [0, 3], b: [7, 3], type: 'sweep', amp: 1, speed: 1.8, phase: 0 },
      { a: [7, 3], b: [14, 3], type: 'sweep', amp: 1, speed: 1.8, phase: Math.PI },
    ],
    cameras: [{ pos: [7, 4.6], angle: S, sweep: 1.0, speed: 1.3 }],
  },
  {
    name: 'The Vault Ring',
    map: [
      '###############',
      '#G.....#.....E#',
      '#.O..D.#.G..O.#',
      '#......#......#',
      '#..###...###..#',
      '#K.#G.....D#..#',
      '#......C......#',
      '#..#D.....G#..#',
      '#..###...###..#',
      '#......#......#',
      '#.O..G.#.D..O.#',
      '#......P......#',
      '###############',
    ],
    guards: [
      { path: [[1, 3], [6, 3]], speed: 3, chase: 5.3 },
      { path: [[13, 3], [8, 3]], speed: 3, chase: 5.3 },
      {
        path: [[4, 6], [6, 6], [6, 5], [8, 5], [8, 6], [10, 6], [8, 6], [8, 7], [6, 7], [6, 6]],
        speed: 3.2,
        chase: 5.3,
      },
      { path: [[13, 9], [8, 9]], speed: 3.2, chase: 5.3 },
    ],
    lasers: [
      { a: [0, 7], b: [3, 7], type: 'blink', on: 1.0, off: 1.2, offset: 1.0 },
      { a: [11, 6], b: [14, 6], type: 'sweep', amp: 1.4, speed: 2.0, phase: 0 },
      { a: [5, 4], b: [9, 4], type: 'blink', on: 1.1, off: 1.1, offset: 0 },
    ],
    cameras: [
      { pos: [7, 3.6], angle: S, sweep: 0.8, speed: 1.4 },
      { pos: [0.6, 2], angle: E, sweep: 0.7, speed: 1.2 },
    ],
  },
  {
    name: 'The Crown Jewel',
    map: [
      '#################',
      '#G..#.......#..D#',
      '#...#.O.E.O.#...#',
      '#.......D.......#',
      '#.###.......###.#',
      '#...#..C.C..#...#',
      '#D..............#',
      '#...#..O.O..#...#',
      '#.###.......###.#',
      '#.......G......K#',
      '#.O...........O.#',
      '#G......P......D#',
      '#################',
    ],
    guards: [
      { path: [[5, 3], [11, 3]], speed: 3.4, chase: 5.6 },
      { path: [[11, 6], [5, 6]], speed: 3.4, chase: 5.6 },
      { path: [[1, 5], [3, 5], [3, 7], [1, 7]], speed: 3, chase: 5.6 },
      { path: [[15, 5], [13, 5], [13, 7], [15, 7]], speed: 3, chase: 5.6 },
      { path: [[2, 9], [7, 9]], speed: 3.4, chase: 5.6 },
    ],
    lasers: [
      { a: [4, 4], b: [12, 4], type: 'blink', on: 1.1, off: 1.0, offset: 0 },
      { a: [12, 8], b: [12, 12], type: 'blink', on: 0.9, off: 1.1, offset: 0.9 },
      { a: [6, 7], b: [10, 7], type: 'sweep', amp: 1, speed: 2.2, phase: 0 },
    ],
    cameras: [
      { pos: [8, 0.6], angle: S, sweep: 1.0, speed: 1.5 },
      { pos: [0.6, 9], angle: E, sweep: 0.8, speed: 1.3 },
      { pos: [15.4, 3], angle: W, sweep: 0.7, speed: 1.2 },
    ],
  },
];

export const LEVEL_TIME = 10;
export const START_LIVES = 3;
export const SMOKE_CHARGES = 2;
export const SMOKE_TIME = 2.5;
export const VALUES = { D: 100, G: 50 };
