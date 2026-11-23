import { useSyncExternalStore } from 'react';
import { LEVEL_TIME, SMOKE_CHARGES, START_LIVES } from './levels.js';
import { runtime } from './runtime.js';
import { UNLOCK_AFTER, WORLDS } from './worlds.js';

const HS_KEY = 'ten-second-thief-highscore'; // unchanged from v1 so old scores survive
const PROGRESS_KEY = 'ten-second-thief-progress';
export const CAMERA_MODES = ['follow', 'cinematic', 'wide', 'first'];
export const CAMERA_LABELS = { follow: 'FOLLOW', cinematic: 'CINEMATIC', wide: 'WIDE', first: 'FIRST PERSON' };

// Append ?unlock to the URL to open every world and level (handy for showing the game off).
const UNLOCK_ALL = typeof location !== 'undefined' && new URLSearchParams(location.search).has('unlock');

function loadHighScore() {
  try {
    return Number(localStorage.getItem(HS_KEY)) || 0;
  } catch {
    return 0;
  }
}

function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
    return {
      cleared: p.cleared && typeof p.cleared === 'object' ? p.cleared : {},
      best: p.best && typeof p.best === 'object' ? p.best : {},
      camera: CAMERA_MODES.includes(p.camera) ? p.camera : 'follow',
    };
  } catch {
    return { cleared: {}, best: {}, camera: 'follow' };
  }
}

function saveProgress() {
  try {
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ cleared: state.cleared, best: state.best, camera: state.cameraMode }),
    );
  } catch {
    /* storage unavailable */
  }
}

function saveHighScore(score) {
  if (score <= state.highScore) return;
  setState({ highScore: score, newRecord: true });
  try {
    localStorage.setItem(HS_KEY, String(score));
  } catch {
    /* storage unavailable */
  }
}

const progress = loadProgress();
runtime.cam.mode = progress.camera;

// screen: title | worlds | levels | briefing | intro | playing | paused | lifelost | complete | gameover | victory
let state = {
  screen: 'title',
  world: 0,
  level: 0,
  hoverWorld: 0,
  attempt: 0,
  lives: START_LIVES,
  score: 0,
  levelStartScore: 0,
  timeLeft: LEVEL_TIME,
  needKey: true,
  hasKey: false,
  targets: 0,
  totalTargets: 0,
  exitOpen: false,
  collected: 0,
  totalItems: 0,
  smoke: SMOKE_CHARGES,
  hidden: false,
  alarm: false,
  lostReason: '',
  result: null,
  message: null,
  highScore: loadHighScore(),
  newRecord: false,
  muted: false,
  cameraMode: progress.camera,
  cleared: progress.cleared,
  best: progress.best,
  previews: {},
  lowGfx: false, // set by the frame-rate watchdog when the device cannot afford real-time shadows
};

const listeners = new Set();
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getState = () => state;

export function setState(patch) {
  let changed = false;
  for (const k in patch) {
    if (patch[k] !== state[k]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useStore(selector) {
  return useSyncExternalStore(subscribe, () => selector(state));
}

let msgId = 0;
export function showMessage(text, tone = 'info') {
  setState({ message: { text, tone, id: ++msgId } });
}

// ---- progression helpers ----------------------------------------------------------------------
export function clearedIn(worldIndex, cleared = state.cleared) {
  return Math.min(cleared[WORLDS[worldIndex].id] || 0, WORLDS[worldIndex].levels.length);
}
export function isWorldUnlocked(worldIndex, cleared = state.cleared) {
  if (UNLOCK_ALL || worldIndex === 0) return true;
  return clearedIn(worldIndex - 1, cleared) >= Math.min(UNLOCK_AFTER, WORLDS[worldIndex - 1].levels.length);
}
export function isLevelUnlocked(worldIndex, levelIndex, cleared = state.cleared) {
  if (!isWorldUnlocked(worldIndex, cleared)) return false;
  return UNLOCK_ALL || levelIndex <= clearedIn(worldIndex, cleared);
}
export const bestKey = (worldIndex, levelIndex) => `${WORLDS[worldIndex].id}:${levelIndex}`;

function beginLevel(world, level) {
  const map = WORLDS[world].levels[level].map.join('');
  const count = (re) => map.replace(re, '').length;
  const totalTargets = count(/[^Tt]/g);
  const needKey = map.includes('K');
  setState({
    screen: 'intro',
    world,
    level,
    attempt: state.attempt + 1,
    score: state.levelStartScore,
    timeLeft: LEVEL_TIME,
    needKey,
    hasKey: false,
    targets: 0,
    totalTargets,
    exitOpen: !needKey && !totalTargets,
    collected: 0,
    totalItems: count(/[^DGdg]/g),
    smoke: SMOKE_CHARGES,
    hidden: false,
    alarm: false,
    result: null,
    message: null,
  });
}

function startRun(world, level) {
  setState({ lives: START_LIVES, score: 0, levelStartScore: 0, newRecord: false });
  beginLevel(world, level);
}

export const actions = {
  // ---- menus ----
  openWorlds() {
    setState({ screen: 'worlds', hoverWorld: state.world, alarm: false, hidden: false, message: null });
  },
  hoverWorld(i) {
    setState({ hoverWorld: i });
  },
  selectWorld(i) {
    if (!isWorldUnlocked(i)) return;
    // jump straight to the furthest unlocked level of that world
    const level = Math.min(clearedIn(i), WORLDS[i].levels.length - 1);
    setState({ screen: 'levels', world: i, level, hoverWorld: i });
  },
  hoverLevel(l) {
    if (state.screen === 'levels' && isLevelUnlocked(state.world, l)) setState({ level: l });
  },
  selectLevel(l) {
    if (!isLevelUnlocked(state.world, l)) return;
    setState({ screen: 'briefing', level: l });
  },
  openLevels() {
    setState({ screen: 'levels', alarm: false, hidden: false, message: null });
  },
  startMission() {
    if (state.screen === 'briefing') startRun(state.world, state.level);
  },
  toTitle() {
    setState({ screen: 'title', alarm: false, hidden: false, message: null });
  },

  // ---- run flow ----
  retry() {
    startRun(state.world, state.level);
  },
  startPlaying() {
    if (state.screen === 'intro') setState({ screen: 'playing' });
  },
  loseLife(reason) {
    if (state.screen !== 'playing') return;
    setState({ screen: 'lifelost', lives: state.lives - 1, lostReason: reason, alarm: false, hidden: false });
  },
  afterLifeLost() {
    if (state.screen !== 'lifelost') return;
    if (state.lives <= 0) {
      setState({ score: state.levelStartScore });
      saveHighScore(state.levelStartScore);
      setState({ screen: 'gameover' });
    } else beginLevel(state.world, state.level);
  },
  completeLevel(timeLeft) {
    if (state.screen !== 'playing') return;
    const { world, level } = state;
    const timeBonus = Math.round(timeLeft * 100);
    const perfect = state.totalItems > 0 && state.collected === state.totalItems ? 250 : 0;
    const loot = state.score - state.levelStartScore;
    const gained = loot + timeBonus + perfect;
    const score = state.levelStartScore + gained;
    const last = level === WORLDS[world].levels.length - 1;
    const id = WORLDS[world].id;
    const key = bestKey(world, level);
    const unlockedBefore = world + 1 < WORLDS.length && isWorldUnlocked(world + 1);
    setState({
      score,
      levelStartScore: score,
      alarm: false,
      hidden: false,
      cleared: { ...state.cleared, [id]: Math.max(state.cleared[id] || 0, level + 1) },
      best: { ...state.best, [key]: Math.max(state.best[key] || 0, gained) },
    });
    const unlockedWorld =
      world + 1 < WORLDS.length && !unlockedBefore && isWorldUnlocked(world + 1) ? WORLDS[world + 1].name : null;
    setState({ result: { loot, timeBonus, perfect, timeLeft, gained, unlockedWorld } });
    saveProgress();
    saveHighScore(score);
    setState({ screen: last ? 'victory' : 'complete' });
  },
  nextLevel() {
    if (state.screen !== 'complete') return;
    beginLevel(state.world, state.level + 1);
  },
  nextWorld() {
    const next = state.world + 1;
    if (next < WORLDS.length && isWorldUnlocked(next)) actions.selectWorld(next);
    else actions.openWorlds();
  },
  pause() {
    if (state.screen === 'playing') setState({ screen: 'paused' });
  },
  resume() {
    if (state.screen === 'paused') setState({ screen: 'playing' });
  },
  restartLevel() {
    beginLevel(state.world, state.level);
  },

  // ---- settings ----
  toggleMute() {
    setState({ muted: !state.muted });
  },
  setCamera(mode) {
    if (!CAMERA_MODES.includes(mode)) return;
    runtime.cam.mode = mode;
    runtime.cam.blend = 0.9; // seconds of eased transition
    setState({ cameraMode: mode });
    saveProgress();
  },
  cycleCamera() {
    actions.setCamera(CAMERA_MODES[(CAMERA_MODES.indexOf(state.cameraMode) + 1) % CAMERA_MODES.length]);
  },
  setLowGfx() {
    setState({ lowGfx: true });
  },
  setPreview(id, url) {
    setState({ previews: { ...state.previews, [id]: url } });
  },
};
