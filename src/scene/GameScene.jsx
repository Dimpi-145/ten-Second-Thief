import { useMemo } from 'react';
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
