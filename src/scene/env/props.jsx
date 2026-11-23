// World-specific set dressing. Each world supplies three interchangeable pieces:
//   Pillar   - the solid "O" tile        Obstacle - the solid "C" tile
//   Decor    - wall-mounted decoration for the whole level
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TILE, cellType } from '../../game/world.js';
import { getLockerTexture, getPaintingTextures, rng } from '../../game/textures.js';
import { ghost, glow, std } from './materials.js';
import { useOwned } from '../useOwned.js';

const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
const cyl6 = new THREE.CylinderGeometry(1, 1, 1, 6);
const ring = new THREE.TorusGeometry(1, 0.08, 6, 22);
const ball = new THREE.IcosahedronGeometry(1, 1);
const plane = new THREE.PlaneGeometry(1, 1);
const FLAT = [Math.PI / 2, 0, 0];

// Inner wall faces that look onto a floor tile: where wall decoration can hang.
function useWallFaces(world, chance, seed) {
  return useMemo(() => {
    const rand = rng(world.levelIndex * 97 + seed);
    const out = [];
    const dirs = [
      [0, 1, 0],
      [0, -1, Math.PI],
      [1, 0, Math.PI / 2],
      [-1, 0, -Math.PI / 2],
    ];
    for (const w of world.walls) {
      for (const [dc, dr, rot] of dirs) {
        const c = w.c + dc;
        const r = w.r + dr;
        if (c < 0 || r < 0 || c >= world.cols || r >= world.rows) continue;
        if (cellType(world, c, r) !== 0) continue;
        if (rand() > chance) continue;
        out.push({
          x: w.x + dc * (TILE / 2 + 0.05),
          z: w.z + dr * (TILE / 2 + 0.05),
          rot,
          n: Math.floor(rand() * 1000),
          key: `${w.c}-${w.r}-${dc}-${dr}`,
        });
      }
    }
    return out;
  }, [world, chance, seed]);
}

function WallItems({ world, chance, seed, y, children }) {
  const faces = useWallFaces(world, chance, seed);
  return faces.map((f) => (
    <group key={f.key} position={[f.x, y, f.z]} rotation={[0, f.rot, 0]}>
      {children(f)}
    </group>
  ));
}

// ================================ GRAND MUSEUM ================================================
const vaseGeo = new THREE.LatheGeometry(
  [[0, 0], [0.2, 0], [0.3, 0.2], [0.16, 0.48], [0.12, 0.62], [0.2, 0.7]].map(([x, y]) => new THREE.Vector2(x, y)),
  8,
);
const bustGeo = new THREE.IcosahedronGeometry(0.3, 0);
const caseGlassGeo = new THREE.BoxGeometry(1.3, 1.1, 1.3);
const caseEdgeGeo = new THREE.EdgesGeometry(caseGlassGeo);
const glassMat = new THREE.MeshStandardMaterial({
  color: '#9fe8ff', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.6, depthWrite: false,
});
const edgeMat = new THREE.LineBasicMaterial({ color: '#7fefff', transparent: true, opacity: 0.7 });
const ART = ['#d9a441', '#c0c8e8', '#b14dff', '#3dffb0'];

function MuseumPillar({ i }) {
  const neon = glow(i % 2 ? '#b14dff' : '#00e5ff');
  const stone = std('#10142c', 0.5, 0.4);
  return (
    <>
      <mesh geometry={box} material={stone} position={[0, 0.125, 0]} scale={[1.1, 0.25, 1.1]} castShadow receiveShadow />
      <mesh geometry={cyl} material={std('#2a3163', 0.45, 0.35)} position={[0, 1.5, 0]} scale={[0.45, 2.5, 0.45]} castShadow receiveShadow />
      <mesh geometry={box} material={stone} position={[0, 2.875, 0]} scale={[1.1, 0.25, 1.1]} castShadow />
      <mesh geometry={ring} material={neon} position={[0, 0.42, 0]} rotation={FLAT} scale={0.5} />
      <mesh geometry={ring} material={neon} position={[0, 2.6, 0]} rotation={FLAT} scale={0.5} />
    </>
  );
}

function MuseumCase({ seed }) {
  return (
    <>
      <mesh geometry={box} material={std('#10142c', 0.5, 0.4)} position={[0, 0.45, 0]} scale={[1.44, 0.9, 1.44]} castShadow receiveShadow />
      <mesh geometry={box} material={glow(seed % 2 ? '#00e5ff' : '#b14dff')} position={[0, 0.92, 0]} scale={[1.5, 0.06, 1.5]} />
      <mesh
        geometry={seed % 3 ? vaseGeo : bustGeo}
        material={std(ART[seed % ART.length], 0.3, 0.8, { flatShading: true })}
        position={[0, seed % 3 ? 0.95 : 1.3, 0]}
        rotation={[0, seed, 0]}
      />
      <mesh geometry={caseGlassGeo} material={glassMat} position={[0, 1.5, 0]} />
      <lineSegments geometry={caseEdgeGeo} material={edgeMat} position={[0, 1.5, 0]} />
    </>
  );
}

function MuseumDecor({ world }) {
  const mats = useOwned(
    () => getPaintingTextures().map((t) => new THREE.MeshBasicMaterial({ map: t, color: '#b8b8c8' })),
    [],
  );
  const frame = std('#c79a3a', 0.35, 0.9);
  return (
    <WallItems world={world} chance={0.3} seed={5} y={1.65}>
      {(f) => (
        <>
          <mesh geometry={box} material={frame} scale={[1.5, 1.15, 0.08]} />
          <mesh geometry={plane} material={mats[f.n % mats.length]} position={[0, 0, 0.05]} scale={[1.3, 0.95, 1]} />
          <mesh geometry={box} material={glow(f.n % 2 ? '#b14dff' : '#00e5ff')} position={[0, 0.72, 0.1]} scale={[1.1, 0.05, 0.12]} />
        </>
      )}
    </WallItems>
  );
}

// ================================ BANK VAULT ==================================================
function BankPillar() {
  const marble = std('#d8d2bf', 0.3, 0.1);
  const brass = std('#c9a13a', 0.3, 0.9);
  return (
    <>
      <mesh geometry={box} material={brass} position={[0, 0.15, 0]} scale={[1.15, 0.3, 1.15]} castShadow receiveShadow />
      <mesh geometry={cyl} material={marble} position={[0, 1.6, 0]} scale={[0.42, 2.7, 0.42]} castShadow receiveShadow />
      <mesh geometry={cyl} material={brass} position={[0, 0.45, 0]} scale={[0.5, 0.18, 0.5]} />
      <mesh geometry={cyl} material={brass} position={[0, 2.85, 0]} scale={[0.5, 0.18, 0.5]} />
      <mesh geometry={box} material={marble} position={[0, 3.08, 0]} scale={[1.15, 0.24, 1.15]} castShadow />
    </>
  );
}

// Teller desk with a banker's lamp and a tray of cash.
function BankDesk({ seed }) {
  const wood = std('#3b2416', 0.6, 0.1);
  return (
    <>
      <mesh geometry={box} material={wood} position={[0, 0.5, 0]} scale={[1.44, 1, 1.44]} castShadow receiveShadow />
      <mesh geometry={box} material={std('#c9a13a', 0.3, 0.9)} position={[0, 1.03, 0]} scale={[1.52, 0.06, 1.52]} castShadow />
      <mesh geometry={box} material={std('#1c4a3a', 0.8, 0)} position={[0, 1.07, 0]} scale={[1.2, 0.02, 1.2]} />
      {/* lamp */}
      <group position={[seed % 2 ? 0.4 : -0.4, 1.08, -0.35]}>
        <mesh geometry={cyl} material={std('#c9a13a', 0.3, 0.9)} position={[0, 0.16, 0]} scale={[0.03, 0.32, 0.03]} />
        <mesh geometry={box} material={glow('#3dffb0')} position={[0, 0.36, 0.06]} scale={[0.36, 0.1, 0.18]} />
      </group>
      {/* cash tray */}
      <group position={[seed % 2 ? -0.3 : 0.3, 1.13, 0.2]} rotation={[0, seed, 0]}>
        <mesh geometry={box} material={std('#2f9e5a', 0.7, 0)} scale={[0.42, 0.1, 0.22]} castShadow />
        <mesh geometry={box} material={std('#2f9e5a', 0.7, 0)} position={[0.02, 0.1, 0.02]} scale={[0.42, 0.1, 0.22]} />
        <mesh geometry={box} material={std('#f4f0dc', 0.8, 0)} position={[0.02, 0.1, 0.02]} scale={[0.1, 0.105, 0.225]} />
      </group>
    </>
  );
}

function BankDecor({ world }) {
  const lockers = useOwned(() => new THREE.MeshStandardMaterial({ map: getLockerTexture(), roughness: 0.35, metalness: 0.7 }), []);
  const brass = std('#c9a13a', 0.3, 0.9);
  return (
    <WallItems world={world} chance={0.42} seed={11} y={1.55}>
      {(f) =>
        f.n % 4 === 0 ? (
          // brass wall sconce
          <>
            <mesh geometry={box} material={brass} position={[0, 0.3, 0.06]} scale={[0.16, 0.5, 0.12]} />
            <mesh geometry={ball} material={glow('#ffe2a0')} position={[0, 0.66, 0.14]} scale={0.14} />
          </>
        ) : (
          <>
            <mesh geometry={box} material={brass} scale={[1.7, 1.3, 0.06]} />
            <mesh geometry={plane} material={lockers} position={[0, 0, 0.04]} scale={[1.6, 1.2, 1]} />
          </>
        )
      }
    </WallItems>
  );
}

// ================================ NEON CASINO =================================================
function CasinoPillar({ i }) {
  const rings = useRef();
  const colors = ['#ff2d95', '#ffc531', '#00e5ff'];
  useFrame((state) => {
    const t = state.clock.elapsedTime * 1.6 + i;
    rings.current.children.forEach((m, k) => {
      m.position.y = 0.5 + ((t * 0.5 + k * 0.85) % 2.5);
    });
  });
  return (
    <>
      <mesh geometry={cyl} material={std('#1a0612', 0.3, 0.8)} position={[0, 1.5, 0]} scale={[0.4, 3, 0.4]} castShadow receiveShadow />
      <mesh geometry={cyl} material={std('#ffc531', 0.3, 1)} position={[0, 0.12, 0]} scale={[0.56, 0.24, 0.56]} castShadow />
      <mesh geometry={cyl} material={std('#ffc531', 0.3, 1)} position={[0, 2.9, 0]} scale={[0.56, 0.2, 0.56]} />
      <group ref={rings}>
        {colors.map((c, k) => (
          <mesh key={c} geometry={ring} material={glow(c)} rotation={FLAT} position={[0, 0.6 + k * 0.8, 0]} scale={0.47} />
        ))}
      </group>
    </>
  );
}

function SlotMachine({ seed }) {
  const screen = useRef();
  const mat = useOwned(() => new THREE.MeshBasicMaterial({ color: '#ff2d95', toneMapped: false }), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime * 2 + seed;
    mat.color.setHSL((t * 0.15) % 1, 1, 0.55 + Math.sin(t * 9) * 0.1);
    screen.current.scale.y = 0.42 + Math.sin(t * 5) * 0.02;
  });
  return (
    <group rotation={[0, (seed % 4) * (Math.PI / 2), 0]}>
      <mesh geometry={box} material={std('#7a0f3a', 0.4, 0.5)} position={[0, 0.9, 0]} scale={[1.3, 1.8, 1.2]} castShadow receiveShadow />
      <mesh geometry={box} material={std('#ffc531', 0.3, 1)} position={[0, 1.86, 0]} scale={[1.4, 0.14, 1.3]} castShadow />
      <mesh ref={screen} geometry={plane} material={mat} position={[0, 1.25, 0.61]} scale={[0.95, 0.42, 1]} />
      <mesh geometry={box} material={std('#1a0612', 0.4, 0.6)} position={[0, 0.72, 0.68]} scale={[1.1, 0.12, 0.22]} />
      <mesh geometry={cyl} material={std('#d8d8e0', 0.2, 1)} position={[0.74, 1.1, 0]} scale={[0.04, 0.7, 0.04]} />
      <mesh geometry={ball} material={glow('#ff2d95')} position={[0.74, 1.5, 0]} scale={0.1} />
    </group>
  );
}

function RouletteTable() {
  const wheel = useRef();
  useFrame((_, dt) => {
    wheel.current.rotation.y += dt * 2.4;
  });
  return (
    <>
      <mesh geometry={cyl} material={std('#2a0a16', 0.5, 0.3)} position={[0, 0.4, 0]} scale={[0.45, 0.8, 0.45]} castShadow />
      <mesh geometry={cyl} material={std('#5a2a12', 0.5, 0.2)} position={[0, 0.9, 0]} scale={[0.72, 0.2, 0.72]} castShadow receiveShadow />
      <mesh geometry={cyl} material={std('#0f6a3c', 0.9, 0)} position={[0, 1.01, 0]} scale={[0.64, 0.02, 0.64]} />
      <group ref={wheel} position={[0, 1.06, 0]}>
        <mesh geometry={cyl} material={std('#ffc531', 0.25, 1)} scale={[0.4, 0.08, 0.4]} castShadow />
        <mesh geometry={box} material={glow('#ff2d95')} position={[0, 0.05, 0]} scale={[0.76, 0.03, 0.07]} />
        <mesh geometry={box} material={glow('#ffffff')} position={[0, 0.05, 0]} scale={[0.07, 0.03, 0.76]} />
        <mesh geometry={ball} material={std('#ffffff', 0.2, 0.3)} position={[0.3, 0.1, 0]} scale={0.05} />
      </group>
      <mesh geometry={ring} material={glow('#ffc531')} rotation={FLAT} position={[0, 1.02, 0]} scale={0.7} />
    </>
  );
}

function CasinoObstacle({ seed }) {
  return seed % 2 ? <SlotMachine seed={seed} /> : <RouletteTable />;
}

function CasinoDecor({ world }) {
  const group = useRef();
  useFrame((state) => {
    // neon signs flicker independently
    const t = state.clock.elapsedTime;
    group.current.children.forEach((g, i) => {
      g.visible = Math.sin(t * (3 + (i % 5)) + i * 1.7) > -0.86;
    });
  });
  const cols = ['#ff2d95', '#ffc531', '#00e5ff', '#b14dff'];
  return (
    <group ref={group}>
      <WallItems world={world} chance={0.34} seed={23} y={1.75}>
        {(f) => {
          const a = glow(cols[f.n % 4]);
          const b = glow(cols[(f.n + 1) % 4]);
          const kind = f.n % 3;
          return (
            <group position={[0, 0, 0.08]}>
              {kind === 0 && (
                <>
                  <mesh geometry={ring} material={a} scale={0.42} />
                  <mesh geometry={box} material={b} rotation={[0, 0, Math.PI / 4]} scale={[0.36, 0.36, 0.05]} />
                </>
              )}
              {kind === 1 && (
                <>
                  <mesh geometry={box} material={a} position={[0, 0.34, 0]} scale={[1.3, 0.07, 0.05]} />
                  <mesh geometry={box} material={a} position={[0, -0.34, 0]} scale={[1.3, 0.07, 0.05]} />
                  <mesh geometry={box} material={b} position={[-0.4, 0, 0]} scale={[0.07, 0.5, 0.05]} />
                  <mesh geometry={box} material={b} position={[0, 0, 0]} scale={[0.07, 0.5, 0.05]} />
                  <mesh geometry={box} material={b} position={[0.4, 0, 0]} scale={[0.07, 0.5, 0.05]} />
                </>
              )}
              {kind === 2 && (
                <>
                  <mesh geometry={ring} material={a} position={[-0.3, 0, 0]} scale={0.26} />
                  <mesh geometry={ring} material={b} position={[0.3, 0, 0]} scale={0.26} />
                  <mesh geometry={box} material={a} position={[0, -0.45, 0]} scale={[1.1, 0.06, 0.05]} />
                </>
              )}
            </group>
          );
        }}
      </WallItems>
    </group>
  );
}

// ================================ CITY ROOFTOP ================================================
function Antenna({ i }) {
  const lamp = useRef();
  useFrame((state) => {
    lamp.current.visible = (state.clock.elapsedTime * 1.3 + i * 0.4) % 1 < 0.5;
  });
  const steel = std('#8a93a6', 0.4, 0.8);
  return (
    <>
      <mesh geometry={box} material={std('#3a3f4d', 0.8, 0.1)} position={[0, 0.2, 0]} scale={[1.1, 0.4, 1.1]} castShadow receiveShadow />
      <mesh geometry={cyl6} material={steel} position={[0, 2.7, 0]} scale={[0.07, 4.6, 0.07]} castShadow />
      <mesh geometry={box} material={steel} position={[0, 3.2, 0]} scale={[1.2, 0.05, 0.05]} />
      <mesh geometry={box} material={steel} position={[0, 4.0, 0]} scale={[0.05, 0.05, 0.8]} />
      <mesh geometry={cyl} material={steel} position={[0.3, 2.2, 0]} rotation={[0, 0, 0.5]} scale={[0.4, 0.08, 0.4]} castShadow />
      <mesh ref={lamp} geometry={ball} material={glow('#ff3030')} position={[0, 5.05, 0]} scale={0.12} />
    </>
  );
}

function AirConUnit({ seed }) {
  const fan = useRef();
  useFrame((_, dt) => {
    fan.current.rotation.y += dt * 9;
  });
  return (
    <>
      <mesh geometry={box} material={std('#8f97a8', 0.6, 0.4)} position={[0, 0.6, 0]} scale={[1.44, 1.2, 1.44]} castShadow receiveShadow />
      <mesh geometry={box} material={std('#2a2e38', 0.7, 0.3)} position={[0, 0.6, 0.73]} scale={[1.1, 0.8, 0.03]} />
      <mesh geometry={cyl} material={std('#2a2e38', 0.6, 0.5)} position={[0, 1.24, 0]} scale={[0.56, 0.08, 0.56]} />
      <group ref={fan} position={[0, 1.3, 0]} rotation={[0, seed, 0]}>
        <mesh geometry={box} material={std('#d8dde8', 0.4, 0.7)} scale={[1, 0.02, 0.16]} />
        <mesh geometry={box} material={std('#d8dde8', 0.4, 0.7)} scale={[0.16, 0.02, 1]} />
      </group>
      <mesh geometry={box} material={glow('#ff8a3d')} position={[0.55, 0.95, 0.74]} scale={[0.12, 0.06, 0.02]} />
    </>
  );
}

// Roof clutter instead of wall art: vents and warning lamps along the parapet.
function RooftopDecor({ world }) {
  return (
    <WallItems world={world} chance={0.16} seed={41} y={0}>
      {(f) =>
        f.n % 2 ? (
          <mesh geometry={cyl} material={std('#6a7284', 0.5, 0.6)} position={[0, 0.5, 0.45]} scale={[0.2, 1, 0.2]} castShadow />
        ) : (
          <>
            <mesh geometry={box} material={std('#2a2e38', 0.7, 0.3)} position={[0, 1.12, -0.5]} scale={[0.14, 0.24, 0.14]} />
            <mesh geometry={ball} material={glow('#ffb86b')} position={[0, 1.32, -0.5]} scale={0.1} />
          </>
        )
      }
    </WallItems>
  );
}

// ================================ SECRET LABORATORY ===========================================
function TeslaCoil({ i }) {
  const orb = useRef();
  const arc = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime * 7 + i * 2;
    orb.current.scale.setScalar(0.2 + Math.sin(t) * 0.035);
    arc.current.rotation.set(Math.sin(t * 1.7) * 1.5, t * 2.3, Math.cos(t * 1.3) * 1.5);
    arc.current.visible = Math.sin(t * 3.1) > -0.3;
  });
  return (
    <>
      <mesh geometry={cyl} material={std('#4a5a60', 0.4, 0.7)} position={[0, 0.3, 0]} scale={[0.52, 0.6, 0.52]} castShadow receiveShadow />
      <mesh geometry={cyl} material={std('#b87333', 0.35, 0.9)} position={[0, 1.3, 0]} scale={[0.26, 1.5, 0.26]} castShadow />
      {[0.8, 1.15, 1.5, 1.85].map((y) => (
        <mesh key={y} geometry={ring} material={std('#d9e2e6', 0.3, 0.8)} rotation={FLAT} position={[0, y, 0]} scale={0.3} />
      ))}
      <mesh geometry={ring} material={std('#d9e2e6', 0.25, 0.9)} rotation={FLAT} position={[0, 2.2, 0]} scale={[0.5, 0.5, 2.2]} castShadow />
      <mesh ref={orb} geometry={ball} material={glow('#9dfff0')} position={[0, 2.62, 0]} scale={0.2} />
      <mesh ref={arc} geometry={ring} material={ghost('#7dfff0', 0.8)} position={[0, 2.62, 0]} scale={[0.42, 0.42, 0.25]} />
    </>
  );
}

function SpecimenTank({ seed }) {
  const blob = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime + seed;
    blob.current.position.y = 1.35 + Math.sin(t * 1.3) * 0.22;
    blob.current.rotation.set(t * 0.5, t * 0.7, 0);
  });
  const steel = std('#5a6a70', 0.35, 0.8);
  return (
    <>
      <mesh geometry={cyl} material={steel} position={[0, 0.25, 0]} scale={[0.72, 0.5, 0.72]} castShadow receiveShadow />
      <mesh geometry={cyl} material={ghost('#3dffb0', 0.22)} position={[0, 1.35, 0]} scale={[0.6, 1.7, 0.6]} />
      <mesh ref={blob} geometry={ball} material={std('#1f8f6a', 0.5, 0.1, { flatShading: true, emissive: '#0a5a40' })} scale={[0.26, 0.34, 0.26]} />
      <mesh geometry={cyl} material={steel} position={[0, 2.3, 0]} scale={[0.72, 0.2, 0.72]} castShadow />
      <mesh geometry={ring} material={glow('#3dffb0')} rotation={FLAT} position={[0, 0.52, 0]} scale={0.66} />
    </>
  );
}

function LabDecor({ world }) {
  const screen = useOwned(() => new THREE.MeshBasicMaterial({ color: '#3dffb0', toneMapped: false }), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    screen.color.setRGB(0.1, 0.75 + Math.sin(t * 13) * 0.08 + Math.sin(t * 2.1) * 0.12, 0.55);
  });
  const dark = std('#1c2a2e', 0.4, 0.6);
  return (
    <WallItems world={world} chance={0.36} seed={57} y={1.6}>
      {(f) =>
        f.n % 3 === 0 ? (
          // coolant pipes
          <>
            <mesh geometry={cyl} material={std('#e8a13a', 0.4, 0.6)} position={[-0.3, 0, 0.12]} scale={[0.09, 2.9, 0.09]} />
            <mesh geometry={cyl} material={std('#3a8ad0', 0.4, 0.6)} position={[0.05, 0, 0.12]} scale={[0.07, 2.9, 0.07]} />
            <mesh geometry={box} material={dark} position={[-0.12, 0.3, 0.1]} scale={[0.6, 0.14, 0.16]} />
          </>
        ) : (
          // wall monitor
          <>
            <mesh geometry={box} material={dark} scale={[1.4, 0.95, 0.1]} />
            <mesh geometry={plane} material={screen} position={[0, 0.04, 0.06]} scale={[1.2, 0.68, 1]} />
            <mesh geometry={box} material={dark} position={[0, 0.04 + ((f.n % 5) - 2) * 0.12, 0.065]} scale={[1.2, 0.03, 0.01]} />
            <mesh geometry={box} material={glow('#ff4d4d')} position={[0.58, -0.4, 0.06]} scale={[0.06, 0.04, 0.02]} />
          </>
        )
      }
    </WallItems>
  );
}

// ================================ SPACE VAULT =================================================
function EnergyPylon({ i }) {
  const halo = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime * 1.4 + i * 1.3;
    halo.current.position.y = 1.5 + Math.sin(t) * 0.95;
    halo.current.rotation.z = t;
  });
  const c = i % 2 ? '#ff6a3d' : '#4d7cff';
  return (
    <>
      <mesh geometry={cyl6} material={std('#1a1f2e', 0.35, 0.8)} position={[0, 0.2, 0]} scale={[0.56, 0.4, 0.56]} castShadow receiveShadow />
      <mesh geometry={cyl6} material={std('#3a425a', 0.3, 0.9)} position={[0, 1.5, 0]} scale={[0.3, 2.6, 0.3]} castShadow />
      <mesh geometry={cyl6} material={glow(c)} position={[0, 1.5, 0]} scale={[0.32, 0.5, 0.1]} />
      <mesh geometry={cyl6} material={glow(c)} position={[0, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.32, 0.5, 0.1]} />
      <mesh geometry={cyl6} material={std('#1a1f2e', 0.35, 0.8)} position={[0, 2.88, 0]} scale={[0.5, 0.24, 0.5]} />
      <mesh ref={halo} geometry={ring} material={glow(c)} rotation={FLAT} scale={0.55} />
    </>
  );
}

function CargoCrate({ seed }) {
  const holo = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime + seed;
    holo.current.rotation.set(t * 0.6, t * 0.9, 0);
    holo.current.position.y = 1.95 + Math.sin(t * 1.7) * 0.1;
  });
  return (
    <>
      <mesh geometry={box} material={std('#3a425a', 0.4, 0.8)} position={[0, 0.65, 0]} scale={[1.4, 1.3, 1.4]} castShadow receiveShadow />
      <mesh geometry={box} material={std('#1a1f2e', 0.4, 0.8)} position={[0, 0.65, 0]} scale={[1.46, 0.2, 1.46]} />
      <mesh geometry={box} material={glow('#4d7cff')} position={[0, 1.31, 0]} scale={[1.1, 0.03, 1.1]} />
      <mesh geometry={box} material={glow('#ff6a3d')} position={[0, 0.3, 0.71]} scale={[0.5, 0.08, 0.02]} />
      <mesh ref={holo} geometry={box} material={ghost('#6d9cff', 0.5)} scale={0.34} />
    </>
  );
}

// Viewports and light panels in the hull.
function SpaceDecor({ world }) {
  return (
    <WallItems world={world} chance={0.4} seed={71} y={1.6}>
      {(f) =>
        f.n % 3 === 0 ? (
          <>
            <mesh geometry={box} material={std('#11141f', 0.3, 0.9)} scale={[1.5, 1, 0.08]} />
            <mesh geometry={plane} material={glow('#0a1030')} position={[0, 0, 0.045]} scale={[1.3, 0.8, 1]} />
            <mesh geometry={ball} material={glow('#ffffff')} position={[0.3, 0.15, 0.05]} scale={0.02} />
            <mesh geometry={ball} material={glow('#9db8ff')} position={[-0.35, -0.1, 0.05]} scale={0.025} />
            <mesh geometry={ball} material={glow('#ffb48a')} position={[0.05, -0.22, 0.05]} scale={0.018} />
          </>
        ) : (
          <>
            <mesh geometry={box} material={glow(f.n % 2 ? '#4d7cff' : '#7da0ff')} position={[0, 0.5, 0.04]} scale={[1.3, 0.08, 0.04]} />
            <mesh geometry={box} material={glow(f.n % 2 ? '#4d7cff' : '#ff6a3d')} position={[0, -0.9, 0.04]} scale={[0.5, 0.05, 0.04]} />
            <mesh geometry={box} material={std('#11141f', 0.3, 0.9)} position={[0, -0.2, 0.03]} scale={[1.5, 0.9, 0.05]} />
          </>
        )
      }
    </WallItems>
  );
}

export const PROPS = {
  museum: { Pillar: MuseumPillar, Obstacle: MuseumCase, Decor: MuseumDecor },
  bank: { Pillar: BankPillar, Obstacle: BankDesk, Decor: BankDecor },
  casino: { Pillar: CasinoPillar, Obstacle: CasinoObstacle, Decor: CasinoDecor },
  rooftop: { Pillar: Antenna, Obstacle: AirConUnit, Decor: RooftopDecor },
  lab: { Pillar: TeslaCoil, Obstacle: SpecimenTank, Decor: LabDecor },
  space: { Pillar: EnergyPylon, Obstacle: CargoCrate, Decor: SpaceDecor },
};
