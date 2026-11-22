// Mutable per-frame state shared between scene components (never triggers React renders).
export const runtime = {
  // yaw: orbit angle, tilt: user pitch offset, zoom: user zoom factor, mode: camera view,
  // blend: seconds left of the eased transition after switching views
  cam: { yaw: 0, tilt: 0, zoom: 1, mode: 'follow', blend: 0 },
  shake: 0,
  emit: null, // (x, y, z, color, count, speed) => void, registered by <Particles />
};

export function addShake(amount) {
  runtime.shake = Math.max(runtime.shake, amount);
}

export function burst(x, y, z, color, count = 24, speed = 4) {
  if (runtime.emit) runtime.emit(x, y, z, color, count, speed);
}
