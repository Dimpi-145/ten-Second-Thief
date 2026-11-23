import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { actions, useStore } from '../game/store.js';
import { WORLDS } from '../game/worlds.js';
import { LevelPreviewScene, WorldSelectScene } from './Diorama.jsx';
import { GameScene } from './GameScene.jsx';
import { TitleScene } from './TitleScene.jsx';

// Local (no network) studio environment so gold and diamonds get crisp reflections.
function Reflections() {
  return (
    <Environment resolution={64} frames={1}>
      <color attach="background" args={['#05060f']} />
      <Lightformer form="rect" intensity={5} color="#00e5ff" position={[-6, 4, 2]} scale={[6, 6, 1]} />
      <Lightformer form="rect" intensity={5} color="#b14dff" position={[6, 4, -2]} scale={[6, 6, 1]} />
      <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[8, 8, 1]} />
      <Lightformer form="ring" intensity={4} color="#ffd9a0" position={[0, 2, 7]} scale={3} />
    </Environment>
  );
}

// ---- Render resolution -----------------------------------------------------------------------
// The drawing buffer (colour + depth, multisampled) is by far the biggest block of memory the
// game owns and the main cost on integrated GPUs, so it is budgeted rather than left to the
// device pixel ratio: a 4K or high-DPI screen would otherwise render 3-4x the pixels.
const DEVICE_DPR = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
const MAX_DPR = Math.min(DEVICE_DPR, 1.25);
const MIN_DPR = Math.min(MAX_DPR, 0.7);
const PIXEL_BUDGET = 1.2e6; // about 1460 x 820 rendered pixels to start with
const STEP = 0.2;

function initialDpr() {
  if (typeof window === 'undefined') return 1;
  const css = Math.max(1, window.innerWidth * window.innerHeight);
  return Math.max(MIN_DPR, Math.min(MAX_DPR, Math.sqrt(PIXEL_BUDGET / css)));
}

// Watches the real frame rate and trades resolution for smoothness. Each one-second window is
// judged by its *median* frame time, so a single stall (level load, shader compile) is ignored.
//  - two slow windows in a row: drop a notch (already at the lowest: give up real-time shadows)
//  - a smooth stretch: try one notch higher; if that costs frames it is undone at once and that
//    notch becomes the ceiling, so the picture settles instead of oscillating.
function AdaptiveResolution({ scene, dpr, onChange, onFloor, hold }) {
  const s = useRef({ scene: '', last: 0, t0: 0, dts: [], slow: 0, fast: 0, best: 0, skip: 2, ceiling: MAX_DPR, trial: 0 });
  useFrame(() => {
    const m = s.current;
    const now = performance.now();
    const dt = now - m.last;
    m.last = now;
    const switched = m.scene !== scene; // a different scene is a different workload: start a fresh window
    m.scene = scene;
    if (switched || hold || document.hidden || dt > 1000) {
      // loading / baking thumbnails / tab was away: nothing here says anything about the GPU
      m.t0 = 0;
      m.skip = 2;
      return;
    }
    if (!m.t0) {
      m.t0 = now;
      m.dts.length = 0;
      return;
    }
    m.dts.push(dt);
    if (now - m.t0 < 1000) return;
    m.dts.sort((a, b) => a - b);
    const fps = 1000 / m.dts[m.dts.length >> 1];
    m.t0 = now;
    m.dts.length = 0;
    if (m.skip > 0) {
      m.skip--;
      return;
    }
    // "smooth" is relative to what the display can show (60 Hz, or a 48 Hz power-saving panel)
    m.best = Math.max(m.best, fps);
    const target = Math.min(60, Math.max(48, m.best));
    const slow = fps < target * 0.87;
    const fast = fps > target * 0.95;

    if (m.trial > 0) {
      // just raised the resolution: it has to stay smooth for three windows to be kept
      if (!fast) {
        m.trial = 0;
        m.fast = 0;
        m.skip = 1;
        m.ceiling = Math.max(MIN_DPR, dpr - STEP);
        onChange(m.ceiling);
      } else m.trial--;
      return;
    }
    if (slow) {
      m.fast = 0;
      if (++m.slow >= 2) {
        m.slow = 0;
        m.skip = 2;
        if (dpr > MIN_DPR + 0.01) onChange(Math.max(MIN_DPR, dpr - STEP));
        else onFloor();
      }
    } else {
      m.slow = 0;
      m.fast = fast ? m.fast + 1 : 0;
      if (m.fast >= 4 && dpr < m.ceiling - 0.01) {
        m.fast = 0;
        m.skip = 1;
        m.trial = 3;
        onChange(Math.min(m.ceiling, dpr + STEP));
      }
    }
  });
  return null;
}

// Re-render the shadow map on every other frame only: the one-frame lag is invisible, and the
// shadow pass (every caster drawn a second time) is one of the most expensive parts of a frame.
function HalfRateShadows() {
  const n = useRef(0);
  useFrame(({ gl }) => {
    gl.shadowMap.autoUpdate = false;
    if (n.current++ % 2 === 0) gl.shadowMap.needsUpdate = true;
  });
  return null;
}

// Which 3D scene sits behind the UI for each screen.
const SCENES = { title: 'title', worlds: 'worlds', levels: 'preview', briefing: 'preview' };

export function GameCanvas() {
  const scene = useStore((s) => SCENES[s.screen] || 'game');
  // the world-select screen renders every world once to bake its card thumbnail
  const baking = useStore((s) => s.screen === 'worlds' && WORLDS.some((w) => !s.previews[w.id]));
  const lowGfx = useStore((s) => s.lowGfx);
  const [dpr, setDpr] = useState(initialDpr);
  return (
    <Canvas
      className="game-canvas"
      shadows={lowGfx ? false : 'percentage'}
      dpr={dpr}
      camera={{ fov: 50, near: 0.2, far: 600, position: [0, 6, 12] }}
      // multisampling quadruples the drawing buffer; dense (phone / retina) screens hide the jaggies anyway
      gl={{ antialias: DEVICE_DPR < 2, powerPreference: 'high-performance', stencil: false }}
      onCreated={(state) => {
        if (import.meta.env.DEV) window.__r3f = state; // lets .verify/perf.mjs read renderer stats
      }}
    >
      <AdaptiveResolution scene={scene} dpr={dpr} onChange={setDpr} onFloor={actions.setLowGfx} hold={baking} />
      <HalfRateShadows />
      <Reflections />
      {scene === 'title' && <TitleScene />}
      {scene === 'worlds' && <WorldSelectScene />}
      {scene === 'preview' && <LevelPreviewScene />}
      {scene === 'game' && <GameScene />}
    </Canvas>
  );
}
