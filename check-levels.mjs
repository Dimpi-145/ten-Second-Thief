// Dev sanity check: validates every level of every world and runs headless bot play-throughs.
import { WORLDS } from './src/game/worlds.js';
import { createWorld, cellType, nextStep, supported, VOID } from './src/game/world.js';
import { step } from './src/game/simulation.js';

let ok = true;
const fail = (msg) => {
  ok = false;
  console.log('    ! ' + msg);
};
const DT = 1 / 60;

WORLDS.forEach((meta, wi) => {
  console.log(`${meta.name}`);
  meta.levels.forEach((def, li) => {
    const w0 = def.map[0].length;
    def.map.forEach((row, r) => {
      if (row.length !== w0) fail(`row ${r} has length ${row.length}, expected ${w0}`);
    });
    const w = createWorld(wi, li);
    if (!w.exit) fail('no exit');
    if (!w.key && !w.targets.length) fail('no objective (needs a key or a target)');
    if (w.doors.length && !w.key) fail('vault door without a key');

    def.guards.forEach((g, gi) =>
      g.path.forEach(([c, r], i) => {
        const [c2, r2] = g.path[(i + 1) % g.path.length];
        if (c !== c2 && r !== r2) fail(`guard ${gi} segment ${i} is not axis-aligned`);
        if (g.fly) return;
        const n = Math.max(Math.abs(c2 - c), Math.abs(r2 - r));
        for (let s = 0; s <= n; s++) {
          const cc = c + Math.sign(c2 - c) * s;
          const rr = r + Math.sign(r2 - r) * s;
          if (cellType(w, cc, rr)) fail(`guard ${gi} path crosses solid cell ${cc},${rr}`);
        }
      }),
    );
    (def.pads || []).forEach((p, i) => {
      const lc = p.pos[0] + p.dir[0] * p.dist;
      const lr = p.pos[1] + p.dir[1] * p.dist;
      if (cellType(w, lc, lr)) fail(`pad ${i} lands on a blocked cell ${lc},${lr}`);
      if (cellType(w, p.pos[0], p.pos[1])) fail(`pad ${i} sits on a blocked cell`);
    });

    // Run 1: stand still -> must end (timeout, capture or trap) within the 10 seconds.
    const idle = createWorld(wi, li);
    let ev = [];
    let frames = 0;
    while (!idle.over && frames < 2000) {
      ev = [];
      step(idle, DT, { mx: 0, mz: 0, smoke: false }, ev);
      frames++;
    }
    const dead = ev.find((e) => e.type === 'dead');
    if (!dead || frames > 601) fail('idle run did not end within 10s');

    // Run 2: hazard-free bot completes the objective. Uses the level's scripted route when it
    // has gaps/platforms, otherwise path-finds key -> targets -> exit.
    const bot = createWorld(wi, li);
    bot.guards = [];
    bot.lasers = [];
    bot.cameras = [];
    bot.zaps = [];
    const out = { x: 0, z: 0 };
    const route = (def.route || []).map(([c, r]) => ({ x: bot.toX(c), z: bot.toZ(r) }));
    let ri = 0;
    let won = false;
    let why = '';
    frames = 0;
    while (!bot.over && frames < 2000) {
      const p = bot.player;
      let mx = 0;
      let mz = 0;
      if (def.route) {
        while (ri < route.length && Math.hypot(route[ri].x - p.x, route[ri].z - p.z) < 0.45) ri++;
        const t = route[Math.min(ri, route.length - 1)];
        const dx = t.x - p.x;
        const dz = t.z - p.z;
        const d = Math.hypot(dx, dz) || 1;
        // only walk when the ground just ahead exists (waits for moving platforms)
        if (supported(bot, p.x + (dx / d) * 0.6, p.z + (dz / d) * 0.6, 0)) {
          mx = dx / d;
          mz = dz / d;
        }
      } else {
        const target =
          bot.key && !bot.hasKey ? bot.key : bot.targets.find((t) => !t.collected) || bot.exit;
        if (nextStep(bot, p.x, p.z, target.x, target.z, out)) {
          const dx = out.x - p.x;
          const dz = out.z - p.z;
          const d = Math.hypot(dx, dz) || 1;
          mx = dx / d;
          mz = dz / d;
        }
      }
      ev = [];
      step(bot, DT, { mx, mz, smoke: false }, ev);
      if (ev.some((e) => e.type === 'win')) won = true;
      if (ev.some((e) => e.type === 'jump')) ri++; // the pad fires before its waypoint counts as reached
      const d = ev.find((e) => e.type === 'dead');
      if (d) why = d.reason;
      frames++;
    }
    const voids = [...bot.grid].filter((t) => t === VOID).length;
    console.log(
      `  ${li + 1}. ${def.name.padEnd(18)} ${won ? `bot escaped with ${bot.timeLeft.toFixed(2)}s left` : `BOT FAILED (${why})`}` +
        `  [key:${bot.key ? 1 : 0} targets:${bot.targets.length} doors:${bot.doors.length} loot:${bot.items.length} void:${voids} idle:${dead ? dead.reason : '-'}]`,
    );
    if (!won) fail('bot could not finish the level in time');
  });
});

console.log(ok ? 'ALL OK' : 'PROBLEMS FOUND');
process.exit(ok ? 0 : 1);
