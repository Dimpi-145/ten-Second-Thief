import { SMOKE_TIME, VALUES } from './levels.js';
import {
  PLATFORM_HALF,
  distToSegment,
  isZeroG,
  lineOfSight,
  moveCircle,
  nextStep,
  supported,
  updateLasers,
  updatePlatforms,
  updateZaps,
} from './world.js';

export const PLAYER_SPEED = 8;
export const PLAYER_RADIUS = 0.42;
export const GUARD_RADIUS = 0.45;
export const GUARD_RANGE = 6;
export const GUARD_HALF_ANGLE = 0.62;
export const CAM_RANGE = 6.5;
export const CAM_HALF_ANGLE = 0.42;
const JUMP_SPEED = 11;
const JUMP_HEIGHT = 2.4;

const TAU = Math.PI * 2;
const wrap = (a) => {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
};
const turn = (from, to, k) => from + wrap(to - from) * k;
const tmp = { x: 0, z: 0 };

function inCone(world, ox, oz, angle, range, half, p, seeThrough) {
  const dx = p.x - ox;
  const dz = p.z - oz;
  const d = Math.hypot(dx, dz);
  if (d > range) return false;
  if (Math.abs(wrap(Math.atan2(dx, dz) - angle)) > half) return false;
  return seeThrough || lineOfSight(world, ox, oz, p.x, p.z);
}

function steer(world, g, tx, tz, speed, dt, collide) {
  const dx = tx - g.x;
  const dz = tz - g.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-4) return 0;
  const stepLen = Math.min(d, speed * dt);
  const mx = (dx / d) * stepLen;
  const mz = (dz / d) * stepLen;
  if (collide) moveCircle(world, g, mx, mz, GUARD_RADIUS);
  else {
    g.x += mx;
    g.z += mz;
  }
  g.angle = turn(g.angle, Math.atan2(dx, dz), 1 - Math.exp(-dt * 10));
  g.walk += stepLen * 2.4;
  g.moving = 1;
  return d - stepLen;
}

// Route around walls: head straight for the target when it is visible,
// otherwise follow the grid path one cell at a time. Drones simply fly straight.
function navigate(world, g, tx, tz, speed, dt) {
  if (g.fly) return steer(world, g, tx, tz, speed, dt, false);
  if (lineOfSight(world, g.x, g.z, tx, tz) || !nextStep(world, g.x, g.z, tx, tz, tmp)) {
    return steer(world, g, tx, tz, speed, dt, true);
  }
  steer(world, g, tmp.x, tmp.z, speed, dt, true);
  return Math.hypot(tx - g.x, tz - g.z);
}

function patrol(world, g, dt) {
  const w = g.path[g.idx];
  if (steer(world, g, w.x, w.z, g.speed, dt, false) < 0.05) g.idx = (g.idx + 1) % g.path.length;
}

function updateGuard(world, g, dt, events) {
  const p = world.player;
  g.moving = 0;
  const dist = Math.hypot(p.x - g.x, p.z - g.z);
  const sees =
    !p.hidden &&
    (inCone(world, g.x, g.z, g.angle, GUARD_RANGE, GUARD_HALF_ANGLE, p, g.fly) ||
      (dist < 1.5 && (g.fly || lineOfSight(world, g.x, g.z, p.x, p.z))));
  const alarmed = world.alarm > 0 && !p.hidden;

  if (sees) g.alert = Math.min(1, g.alert + dt * (dist < 3 ? 8 : 4));
  else g.alert = Math.max(0, g.alert - dt * 0.8);

  if (g.state !== 'chase' && ((sees && g.alert >= 1) || alarmed)) {
    g.state = 'chase';
    g.lose = 0;
    g.lastX = p.x;
    g.lastZ = p.z;
    events.push({ type: 'spotted' });
  }

  if (g.state === 'chase') {
    if (p.hidden) {
      g.state = 'search';
      g.lose = 0;
    } else {
      if (sees || alarmed) {
        g.lastX = p.x;
        g.lastZ = p.z;
        g.lose = 0;
      } else g.lose += dt;
      const left = navigate(world, g, g.lastX, g.lastZ, g.chaseSpeed, dt);
      if (g.lose > 1.6 || (!sees && !alarmed && left < 0.3)) {
        g.state = 'search';
        g.lose = 0;
      }
    }
  } else if (g.state === 'search') {
    g.lose += dt;
    g.angle += dt * 3.2;
    if (g.lose > 1.2 && !p.hidden) g.state = 'return';
  } else if (g.state === 'return') {
    const w = g.path[g.idx];
    if (navigate(world, g, w.x, w.z, g.speed, dt) < 0.15) g.state = 'patrol';
  } else patrol(world, g, dt);

  // Ground guards cannot grab a player who is mid-jump; drones can.
  if (!p.hidden && dist < 0.95 && (g.fly || !p.jump)) {
    events.push({ type: 'dead', reason: g.fly ? 'drone' : 'guard' });
  }
}

function refreshExit(world) {
  world.exitOpen = (!world.key || world.hasKey) && world.targetsLeft === 0;
}

// Animates a level with nobody in it (menu dioramas and previews).
export function idleStep(world, dt) {
  world.t += dt;
  updateLasers(world);
  updatePlatforms(world);
  updateZaps(world);
  for (const c of world.cameras) c.angle = c.base + Math.sin(world.t * c.speed) * c.sweep;
  for (const g of world.guards) {
    g.moving = 0;
    patrol(world, g, dt);
  }
}

export function step(world, dt, input, events) {
  if (world.over) return;
  const p = world.player;
  world.t += dt;
  world.timeLeft -= dt;

  // Smoke bomb
  if (input.smoke && world.smokeCharges > 0 && world.smokeT <= 0) {
    world.smokeCharges--;
    world.smokeT = SMOKE_TIME;
    world.alarm = 0;
    events.push({ type: 'smoke', x: p.x, z: p.z });
  }
  if (world.smokeT > 0) world.smokeT -= dt;
  p.hidden = world.smokeT > 0;

  // Moving platforms carry the player standing on them.
  if (world.platforms.length) {
    let ride = null;
    if (!p.jump) {
      for (const pl of world.platforms) {
        if (Math.abs(p.x - pl.x) < PLATFORM_HALF + 0.05 && Math.abs(p.z - pl.z) < PLATFORM_HALF + 0.05) ride = pl;
      }
    }
    updatePlatforms(world);
    if (ride) {
      p.x += ride.mx;
      p.z += ride.mz;
    }
  }

  const zeroG = !p.jump && isZeroG(world, p.x, p.z);
  p.float += ((zeroG ? 1 : 0) - p.float) * (1 - Math.exp(-dt * 5));

  if (p.jump) {
    // Jump-pad arc: no steering until we land.
    const j = p.jump;
    j.t += dt;
    const f = Math.min(1, j.t / j.dur);
    p.x = j.fx + (j.tx - j.fx) * f;
    p.z = j.fz + (j.tz - j.fz) * f;
    p.y = Math.sin(f * Math.PI) * JUMP_HEIGHT;
    p.walk += dt * 6;
    if (f >= 1) {
      p.jump = null;
      p.y = 0;
      events.push({ type: 'land', x: p.x, z: p.z });
    }
  } else {
    let mx = input.mx;
    let mz = input.mz;
    const ml = Math.hypot(mx, mz);
    if (ml > 1) {
      mx /= ml;
      mz /= ml;
    }
    // Zero gravity: thrust builds slowly and momentum carries you.
    const k = 1 - Math.exp(-dt * (zeroG ? 2.2 : 18));
    p.vx += (mx * PLAYER_SPEED - p.vx) * k;
    p.vz += (mz * PLAYER_SPEED - p.vz) * k;
    moveCircle(world, p, p.vx * dt, p.vz * dt, PLAYER_RADIUS, false);
    p.speed = Math.hypot(p.vx, p.vz);
    if (p.speed > 0.6) {
      p.angle = turn(p.angle, Math.atan2(p.vx, p.vz), 1 - Math.exp(-dt * (zeroG ? 6 : 20)));
      p.walk += p.speed * dt * 2.2;
    }
    p.y = p.float * (0.55 + Math.sin(world.t * 2.4) * 0.12);

    for (const pad of world.pads) {
      if (Math.hypot(pad.x - p.x, pad.z - p.z) < 0.7) {
        const d = Math.hypot(pad.tx - pad.x, pad.tz - pad.z);
        p.jump = { t: 0, dur: d / JUMP_SPEED, fx: p.x, fz: p.z, tx: pad.tx, tz: pad.tz };
        p.vx = pad.dx * PLAYER_SPEED;
        p.vz = pad.dz * PLAYER_SPEED;
        p.angle = Math.atan2(pad.dx, pad.dz);
        events.push({ type: 'jump', x: pad.x, z: pad.z });
        break;
      }
    }

    if (world.hasVoid && !p.jump && !supported(world, p.x, p.z)) {
      world.fell = true;
      events.push({ type: 'dead', reason: 'fall' });
    }
  }

  // Treasure
  for (const it of world.items) {
    if (it.collected) continue;
    if (Math.hypot(it.x - p.x, it.z - p.z) < 0.95) {
      it.collected = true;
      events.push({ type: 'pickup', kind: it.kind, x: it.x, z: it.z, value: VALUES[it.kind] });
    }
  }
  const key = world.key;
  if (key && !key.collected && Math.hypot(key.x - p.x, key.z - p.z) < 0.95) {
    key.collected = true;
    world.hasKey = true;
    for (const d of world.doors) {
      d.open = true;
      world.grid[d.r * world.cols + d.c] = 0;
    }
    refreshExit(world);
    events.push({ type: 'key', x: key.x, z: key.z, doors: world.doors.length });
  }
  for (const tg of world.targets) {
    if (tg.collected) continue;
    if (Math.hypot(tg.x - p.x, tg.z - p.z) < 1.05) {
      tg.collected = true;
      world.targetsLeft--;
      refreshExit(world);
      events.push({ type: 'target', x: tg.x, z: tg.z, left: world.targetsLeft });
    }
  }

  // Exit
  world.lockedMsgT -= dt;
  if (Math.hypot(world.exit.x - p.x, world.exit.z - p.z) < 0.9) {
    if (world.exitOpen) {
      world.over = true;
      events.push({ type: 'win', x: world.exit.x, z: world.exit.z });
      return;
    }
    if (world.lockedMsgT <= 0) {
      world.lockedMsgT = 1.5;
      events.push({ type: 'locked' });
    }
  }

  // Lasers and electric traps (a jumping player clears them)
  updateLasers(world);
  updateZaps(world);
  if (!p.jump) {
    for (const l of world.lasers) {
      if (!l.active) continue;
      if (distToSegment(p.x, p.z, l.ax, l.az, l.bx, l.bz) < PLAYER_RADIUS * 0.8) {
        events.push({ type: 'dead', reason: 'laser' });
        break;
      }
    }
    for (const z of world.zaps) {
      if (z.active && Math.abs(p.x - z.x) < 0.85 && Math.abs(p.z - z.z) < 0.85) {
        events.push({ type: 'dead', reason: 'zap' });
        break;
      }
    }
  }

  // Security cameras
  const wasAlarm = world.alarm > 0;
  if (world.alarm > 0) world.alarm -= dt;
  for (const c of world.cameras) {
    c.angle = c.base + Math.sin(world.t * c.speed) * c.sweep;
    c.seeing = !p.hidden && inCone(world, c.x, c.z, c.angle, CAM_RANGE, CAM_HALF_ANGLE, p, false);
    c.detect = c.seeing ? c.detect + dt : 0;
    if (c.detect > 0.22) world.alarm = 3;
  }
  if (!wasAlarm && world.alarm > 0) events.push({ type: 'alarm' });

  // Guards and drones
  for (const g of world.guards) updateGuard(world, g, dt, events);

  // Clock
  if (world.timeLeft <= 0) {
    world.timeLeft = 0;
    if (!events.some((e) => e.type === 'dead')) events.push({ type: 'dead', reason: 'time' });
  }
  if (events.some((e) => e.type === 'dead')) world.over = true;
}
