// Interactive level machinery introduced by the new worlds: vault doors, jump pads,
// moving platforms, electric trap tiles and zero-gravity zones. All read live state from `world`.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TILE } from '../game/world.js';
import { rng } from '../game/textures.js';
import { ghost, glow, std } from './env/materials.js';
import { useOwned } from './useOwned.js';

const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 20);
const ring = new THREE.TorusGeometry(1, 0.08, 6, 24);
const plane = new THREE.PlaneGeometry(1, 1);
const FLAT = [Math.PI / 2, 0, 0];
const DOWN = [-Math.PI / 2, 0, 0];

// ---- Vault door: round steel door that spins its wheel and sinks into the floor --------------
function VaultDoor({ door }) {
  const slab = useRef();
  const wheel = useRef();
  const lamp = useOwned(() => new THREE.MeshBasicMaterial({ color: '#ff2545', toneMapped: false }), []);
  const anim = useRef(0);
  useFrame((_, dt) => {
    anim.current = Math.min(1, Math.max(0, anim.current + (door.open ? dt * 1.6 : -dt * 3)));
    const k = anim.current;
    wheel.current.rotation.z = k * 9;
    // wheel spins first, then the slab drops
    slab.current.position.y = 1.5 - Math.max(0, k - 0.35) * 5.2;
    lamp.color.set(door.open ? '#2dffa0' : '#ff2545');
  });
  const steel = std('#9aa6a2', 0.25, 0.9);
  const dark = std('#39433f', 0.4, 0.8);
  const brass = std('#c9a13a', 0.3, 0.9);
  return (
    <group position={[door.x, 0, door.z]} rotation={[0, door.horizontal ? 0 : Math.PI / 2, 0]}>
      {/* frame */}
      <mesh geometry={box} material={dark} position={[-0.92, 1.6, 0]} scale={[0.16, 3.2, 1.2]} castShadow />
      <mesh geometry={box} material={dark} position={[0.92, 1.6, 0]} scale={[0.16, 3.2, 1.2]} castShadow />
      <mesh geometry={box} material={dark} position={[0, 3.05, 0]} scale={[2, 0.3, 1.2]} castShadow />
      <mesh geometry={box} material={lamp} position={[0, 2.82, 0.62]} scale={[0.7, 0.1, 0.04]} />
      <mesh geometry={box} material={lamp} position={[0, 2.82, -0.62]} scale={[0.7, 0.1, 0.04]} />
      <group ref={slab} position={[0, 1.5, 0]}>
        <mesh geometry={box} material={dark} scale={[1.7, 2.9, 0.5]} castShadow receiveShadow />
        {[0.36, -0.36].map((z) => (
          <group key={z} position={[0, 0, z]}>
            <mesh geometry={cyl} material={steel} rotation={FLAT} scale={[0.8, 0.14, 0.8]} castShadow />
            <mesh geometry={ring} material={brass} scale={0.72} />
          </group>
        ))}
        <group ref={wheel} position={[0, 0, 0.5]}>
          <mesh geometry={ring} material={brass} scale={0.36} />
          <mesh geometry={box} material={brass} scale={[0.72, 0.07, 0.07]} />
          <mesh geometry={box} material={brass} scale={[0.07, 0.72, 0.07]} />
          <mesh geometry={cyl} material={steel} rotation={FLAT} scale={[0.12, 0.2, 0.12]} />
        </group>
      </group>
    </group>
  );
}

// ---- Jump pad: launches the player across a rooftop gap ---------------------------------------
function JumpPad({ pad }) {
  const arrows = useRef();
  const mat = useOwned(() => new THREE.MeshBasicMaterial({ color: '#ff8a3d', toneMapped: false }), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime * 3;
    mat.color.setRGB(1, 0.45 + Math.sin(t * 2) * 0.15, 0.18);
    arrows.current.children.forEach((m, i) => {
      m.position.x = -0.45 + ((t * 0.3 + i * 0.33) % 1) * 0.9;
    });
  });
  return (
    <group position={[pad.x, 0, pad.z]} rotation={[0, Math.atan2(-pad.dz, pad.dx), 0]}>
      <mesh geometry={cyl} material={std('#2a2e38', 0.5, 0.7)} position={[0, 0.06, 0]} scale={[0.85, 0.12, 0.85]} receiveShadow />
      <mesh geometry={ring} material={mat} rotation={FLAT} position={[0, 0.13, 0]} scale={0.8} />
      <mesh geometry={plane} material={ghost('#ff8a3d', 0.35)} rotation={DOWN} position={[0, 0.03, 0]} scale={3} />
      {/* chevrons pointing along the launch direction (local +x) */}
      <group ref={arrows} position={[0, 0.14, 0]}>
        {[0, 1, 2].map((i) => (
          <group key={i}>
            <mesh geometry={box} material={mat} position={[0, 0, 0.14]} rotation={[0, 0.7, 0]} scale={[0.07, 0.03, 0.42]} />
            <mesh geometry={box} material={mat} position={[0, 0, -0.14]} rotation={[0, -0.7, 0]} scale={[0.07, 0.03, 0.42]} />
          </group>
        ))}
      </group>
      {/* dotted flight arc */}
      {[0.2, 0.4, 0.6, 0.8].map((f) => {
        const d = Math.hypot(pad.tx - pad.x, pad.tz - pad.z);
        return (
          <mesh key={f} geometry={box} material={ghost('#ffb86b', 0.7)} position={[f * d, Math.sin(f * Math.PI) * 2.4 + 0.3, 0]} scale={0.12} />
        );
      })}
    </group>
  );
}

// ---- Moving platform -------------------------------------------------------------------------
function Platform({ p, accent }) {
  const ref = useRef();
  useFrame(() => {
    ref.current.position.set(p.x, 0, p.z);
  });
  return (
    <group ref={ref}>
      <mesh geometry={box} material={std('#5a6a70', 0.35, 0.8)} position={[0, -0.14, 0]} scale={[1.9, 0.28, 1.9]} castShadow receiveShadow />
      <mesh geometry={box} material={glow(accent)} position={[0, -0.02, 0]} scale={[1.94, 0.05, 1.94]} />
      <mesh geometry={box} material={std('#c8d4d8', 0.4, 0.5)} position={[0, 0.005, 0]} scale={[1.7, 0.02, 1.7]} receiveShadow />
      <mesh geometry={cyl} material={ghost(accent, 0.35)} position={[0, -1.6, 0]} scale={[0.25, 2.6, 0.25]} />
      <mesh geometry={cyl} material={std('#2a3438', 0.4, 0.8)} position={[0, -0.4, 0]} scale={[0.5, 0.3, 0.5]} />
    </group>
  );
}

// ---- Electric trap tile ----------------------------------------------------------------------
const boltGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 4);

function ZapTile({ zap }) {
  const bolts = useRef();
  const { plate, field } = useOwned(
    () => ({
      plate: new THREE.MeshBasicMaterial({ color: '#16404a', toneMapped: false }),
      field: new THREE.MeshBasicMaterial({
        color: '#7df6ff', transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
      }),
    }),
    [],
  );
  useFrame((state) => {
    const on = zap.active;
    const blink = zap.warn && Math.sin(state.clock.elapsedTime * 40) > 0;
    plate.color.set(on ? '#bffcff' : blink ? '#ffd21a' : '#16404a');
    field.opacity = on ? 0.3 + Math.random() * 0.25 : 0;
    bolts.current.visible = on;
    if (on) {
      // re-randomise the arcs every frame for a crackling look
      bolts.current.children.forEach((b) => {
        b.position.set((Math.random() - 0.5) * 1.5, 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 1.5);
        b.rotation.set((Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 1.6);
        b.scale.y = 0.6 + Math.random() * 1.1;
      });
    }
  });
  const metal = std('#3a4a50', 0.3, 0.9);
  return (
    <group position={[zap.x, 0, zap.z]}>
      <mesh geometry={box} material={metal} position={[0, 0.02, 0]} scale={[1.8, 0.04, 1.8]} receiveShadow />
      {[-0.6, -0.2, 0.2, 0.6].map((o) => (
        <group key={o}>
          <mesh geometry={box} material={plate} position={[o, 0.045, 0]} scale={[0.06, 0.02, 1.7]} />
          <mesh geometry={box} material={plate} position={[0, 0.045, o]} scale={[1.7, 0.02, 0.06]} />
        </group>
      ))}
      {[[-0.82, -0.82], [0.82, -0.82], [-0.82, 0.82], [0.82, 0.82]].map(([x, z]) => (
        <mesh key={`${x}${z}`} geometry={cyl} material={metal} position={[x, 0.25, z]} scale={[0.07, 0.5, 0.07]} castShadow />
      ))}
      <mesh geometry={box} material={field} position={[0, 0.7, 0]} scale={[1.7, 1.3, 1.7]} />
      <group ref={bolts} visible={false}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} geometry={boltGeo} material={glow('#e8feff')} />
        ))}
      </group>
    </group>
  );
}

// ---- Zero-gravity zone: tinted floor and drifting motes --------------------------------------
function ZeroZone({ world }) {
  const tiles = useRef();
  const motes = useRef();
  const cells = world.zeroCells;
  const COUNT = Math.min(160, cells.length * 5);
  const seeds = useMemo(() => {
    const rand = rng(world.levelIndex * 13 + 3);
    return Array.from({ length: COUNT }, () => {
      const c = cells[Math.floor(rand() * cells.length)];
      return { x: c.x + (rand() - 0.5) * TILE, z: c.z + (rand() - 0.5) * TILE, y: rand() * 3.2, s: 0.25 + rand() * 0.5, p: rand() * 6 };
    });
  }, [cells, COUNT, world.levelIndex]);
  const geo = useOwned(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    return g;
  }, [COUNT]);
  const tileMat = useOwned(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#7d5cff', transparent: true, opacity: 0.2, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false,
      }),
    [],
  );

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const s = new THREE.Vector3(TILE - 0.12, TILE - 0.12, 1);
    const p = new THREE.Vector3();
    cells.forEach((c, i) => {
      tiles.current.setMatrixAt(i, m.compose(p.set(c.x, 0.03, c.z), q, s));
    });
    tiles.current.instanceMatrix.needsUpdate = true;
  }, [cells]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    tileMat.opacity = 0.16 + Math.sin(t * 2) * 0.06;
    const pos = geo.attributes.position.array;
    seeds.forEach((s, i) => {
      pos[i * 3] = s.x + Math.sin(t * s.s + s.p) * 0.3;
      pos[i * 3 + 1] = 0.2 + ((s.y + t * s.s * 0.5) % 3.4);
      pos[i * 3 + 2] = s.z + Math.cos(t * s.s * 0.8 + s.p) * 0.3;
    });
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={tiles} args={[plane, tileMat, cells.length]} frustumCulled={false} />
      <points ref={motes} geometry={geo} frustumCulled={false}>
        <pointsMaterial color="#b9a8ff" size={0.09} transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>
    </>
  );
}

export function Mechanisms({ world }) {
  const accent = world.theme.accent;
  return (
    <>
      {world.doors.map((d, i) => (
        <VaultDoor key={`d${i}`} door={d} />
      ))}
      {world.pads.map((p, i) => (
        <JumpPad key={`j${i}`} pad={p} />
      ))}
      {world.platforms.map((p, i) => (
        <Platform key={`m${i}`} p={p} accent={accent} />
      ))}
      {world.zaps.map((z, i) => (
        <ZapTile key={`z${i}`} zap={z} />
      ))}
      {world.zeroCells.length > 0 && <ZeroZone world={world} />}
    </>
  );
}
