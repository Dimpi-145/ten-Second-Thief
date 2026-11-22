import { useFrame } from '@react-three/fiber';
import { sfx } from '../game/audio.js';
import { readInput } from '../game/input.js';
import { addShake, burst, runtime } from '../game/runtime.js';
import { step } from '../game/simulation.js';
import { actions, getState, setState, showMessage } from '../game/store.js';
import { LOOT_COLOR } from './ModelsExtra.jsx';

const events = [];
const REASONS = {
  guard: 'BUSTED BY SECURITY',
  drone: 'TAGGED BY A DRONE',
  laser: 'LASER TRIPPED',
  zap: 'ELECTROCUTED',
  fall: 'LONG WAY DOWN',
  time: "TIME'S UP",
};

function exitHint(world) {
  const { labels } = world.meta;
  if (world.key && !world.hasKey) return `${labels.exit} LOCKED — FIND THE ${labels.key}`;
  return `${labels.exit} LOCKED — ${labels.target} REMAINING`;
}

function handle(e, world) {
  const s = getState();
  const { labels } = world.meta;
  switch (e.type) {
    case 'pickup': {
      const diamond = e.kind === 'D';
      setState({ score: s.score + e.value, collected: s.collected + 1 });
      burst(e.x, 1, e.z, LOOT_COLOR[world.theme.loot[e.kind]] || '#ffc531', diamond ? 34 : 24, 4.2);
      showMessage(`+${e.value}`, diamond ? 'cyan' : 'gold');
      if (diamond) sfx.diamond();
      else sfx.gold();
      break;
    }
    case 'key':
      setState({ hasKey: true, exitOpen: world.exitOpen });
      burst(e.x, 1.1, e.z, '#c77dff', 40, 4.5);
      showMessage(
        e.doors ? `${labels.key} ACQUIRED — VAULT OPENING` : `${labels.key} ACQUIRED — ${labels.exit} UNLOCKED`,
        'purple',
      );
      if (e.doors) addShake(0.25);
      sfx.key();
      break;
    case 'target':
      setState({ targets: s.targets + 1, exitOpen: world.exitOpen });
      burst(e.x, 1.2, e.z, world.theme.accent2, 44, 4.8);
      showMessage(
        e.left > 0 ? `${labels.target}: ${e.left} TO GO` : `${labels.target} SECURED — GET TO THE ${labels.exit}`,
        'gold',
      );
      sfx.key();
      break;
    case 'locked':
      showMessage(exitHint(world), 'red');
      sfx.locked();
      break;
    case 'jump':
      burst(e.x, 0.3, e.z, '#ff8a3d', 22, 3.5);
      sfx.jump();
      break;
    case 'land':
      burst(e.x, 0.2, e.z, '#c9d2ff', 14, 2.5);
      addShake(0.14);
      break;
    case 'smoke':
      burst(e.x, 0.8, e.z, '#c9d2ff', 30, 3);
      addShake(0.12);
      sfx.smoke();
      break;
    case 'spotted':
      sfx.spotted();
      break;
    case 'alarm':
      showMessage('CAMERA ALERT — GUARDS INCOMING', 'red');
      addShake(0.2);
      sfx.alarm();
      break;
    case 'dead':
      if (s.screen !== 'playing') break;
      burst(world.player.x, 1, world.player.z, e.reason === 'zap' ? '#bffcff' : '#ff2545', 46, 5);
      addShake(0.9);
      sfx.dead();
      actions.loseLife(REASONS[e.reason]);
      break;
    case 'win':
      burst(e.x, 1.2, e.z, '#2dffa0', 60, 5.5);
      addShake(0.25);
      sfx.win();
      actions.completeLevel(world.timeLeft);
      break;
    default:
  }
}

// Advances the game world once per rendered frame while the game is in the "playing" state.
export function Simulation({ world }) {
  useFrame((_, rawDt) => {
    if (getState().screen !== 'playing' || world.over) return;
    const dt = Math.min(rawDt, 0.05);
    const fp = runtime.cam.mode === 'first';
    const input = readInput(runtime.cam.yaw, fp);
    if (fp) runtime.cam.yaw -= input.turn * 2.8 * dt;
    events.length = 0;
    step(world, dt, input, events);
    for (const e of events) handle(e, world);
    if (getState().screen === 'playing') {
      setState({
        timeLeft: Math.max(0, world.timeLeft),
        alarm: world.alarm > 0,
        smoke: world.smokeCharges,
        hidden: world.player.hidden,
      });
    }
  });
  return null;
}
