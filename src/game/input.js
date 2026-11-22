// Keyboard + touch input. State lives outside React so the game loop can read it every frame.
const keys = new Set();
let smokeQueued = false;
export const joystick = { x: 0, y: 0 };

const MOVE_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
]);

export function queueSmoke() {
  smokeQueued = true;
}

export function clearInput() {
  keys.clear();
  smokeQueued = false;
  joystick.x = 0;
  joystick.y = 0;
}

// Installs listeners; returns a cleanup function that removes every one of them.
export function installKeyboard(isGameplay) {
  const down = (e) => {
    if (MOVE_KEYS.has(e.code) && isGameplay()) e.preventDefault();
    if (e.code === 'Space' && !e.repeat && isGameplay()) smokeQueued = true;
    keys.add(e.code);
  };
  const up = (e) => {
    // Stop SPACE from "clicking" a HUD button that still has focus mid-run.
    if (e.code === 'Space' && isGameplay()) e.preventDefault();
    keys.delete(e.code);
  };
  const blur = () => keys.clear();
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
    clearInput();
  };
}

const out = { mx: 0, mz: 0, turn: 0, smoke: false };

// Converts raw input to a world-space move vector relative to the camera yaw.
// In first-person mode left/right turn the view instead of strafing.
export function readInput(yaw, firstPerson = false) {
  let f = 0;
  let r = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) r += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) r -= 1;
  f += -joystick.y;
  r += joystick.x;
  out.turn = 0;
  if (firstPerson) {
    out.turn = Math.max(-1, Math.min(1, r));
    r = 0;
  }
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  out.mx = -sin * f + cos * r;
  out.mz = -cos * f - sin * r;
  out.smoke = smokeQueued;
  smokeQueued = false;
  return out;
}
