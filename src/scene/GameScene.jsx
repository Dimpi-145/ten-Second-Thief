import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { createWorld } from '../game/world.js';
import { useStore } from '../game/store.js';
import { CameraRig } from './CameraRig.jsx';
import { Particles, Smoke } from './Effects.jsx';
import { Guards } from './Guards.jsx';
import { Lasers, SecurityCameras } from './Hazards.jsx';
import { Mechanisms } from './Mechanisms.jsx';
import { Player } from './Player.jsx';
import { Simulation } from './Simulation.jsx';
import { Treasures } from './Treasures.jsx';
import { Environment } from './env/Environment.jsx';

// Everything that makes up a level except the player. Shared by gameplay and the menu dioramas.
export function LevelContent({ world, cutaway = false }) {
  return (
    <>
      <Environment world={world} cutaway={cutaway} />
      <Mechanisms world={world} />
      <Treasures world={world} />
      <Lasers world={world} />
      <SecurityCameras world={world} />
      <Guards world={world} />
    </>
  );
}

// One attempt at one level. Remounted (via key) on every retry so all state starts fresh.
function Attempt({ worldIndex, level }) {
  const world = useMemo(() => createWorld(worldIndex, level), [worldIndex, level]);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  // Build every shader the level can need while the intro card is still up. Objects that start
  // hidden (smoke cloud, alert markers, electric arcs) would otherwise compile theirs the first
  // time they appear, which shows up as a freeze in the middle of a ten-second run.
  useEffect(() => {
    const hidden = [];
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    try {
      gl.compile(scene, camera);
    } catch {
      /* purely an optimisation */
    }
    for (const o of hidden) o.visible = false;
  }, [gl, scene, camera]);
  return (
    <>
      <Simulation world={world} />
      <CameraRig world={world} />
      <LevelContent world={world} cutaway />
      <Player world={world} />
      <Smoke world={world} />
    </>
  );
}

export function GameScene() {
  const worldIndex = useStore((s) => s.world);
  const level = useStore((s) => s.level);
  const attempt = useStore((s) => s.attempt);
  return (
    <>
      <Attempt key={attempt} worldIndex={worldIndex} level={level} />
      <Particles />
    </>
  );
}
