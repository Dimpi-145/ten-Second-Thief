import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { useStore } from '../game/store.js';
import { LevelPreviewScene, WorldSelectScene } from './Diorama.jsx';
import { GameScene } from './GameScene.jsx';
import { TitleScene } from './TitleScene.jsx';

// Local (no network) studio environment so gold and diamonds get crisp reflections.
function Reflections() {
  return (
    <Environment resolution={128} frames={1}>
      <color attach="background" args={['#05060f']} />
      <Lightformer form="rect" intensity={5} color="#00e5ff" position={[-6, 4, 2]} scale={[6, 6, 1]} />
      <Lightformer form="rect" intensity={5} color="#b14dff" position={[6, 4, -2]} scale={[6, 6, 1]} />
      <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[8, 8, 1]} />
      <Lightformer form="ring" intensity={4} color="#ffd9a0" position={[0, 2, 7]} scale={3} />
    </Environment>
  );
}

// Which 3D scene sits behind the UI for each screen.
const SCENES = { title: 'title', worlds: 'worlds', levels: 'preview', briefing: 'preview' };

export function GameCanvas() {
  const scene = useStore((s) => SCENES[s.screen] || 'game');
  return (
    <Canvas
      className="game-canvas"
      shadows="percentage"
      dpr={[1, 1.75]}
      camera={{ fov: 50, near: 0.2, far: 600, position: [0, 6, 12] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <Reflections />
      {scene === 'title' && <TitleScene />}
      {scene === 'worlds' && <WorldSelectScene />}
      {scene === 'preview' && <LevelPreviewScene />}
      {scene === 'game' && <GameScene />}
    </Canvas>
  );
}
