import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getGlowTexture, getWindowTexture, rng } from '../../game/textures.js';
import { useOwned } from '../useOwned.js';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const planeGeo = new THREE.PlaneGeometry(1, 1);

function starGeometry(count, radius, upperOnly, seed) {
  const rand = rng(seed);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = rand() * Math.PI * 2;
    const v = upperOnly ? rand() * 0.95 + 0.03 : rand() * 2 - 1;
    const s = Math.sqrt(1 - v * v);
    pos[i * 3] = Math.cos(u) * s * radius;
    pos[i * 3 + 1] = v * radius;
    pos[i * 3 + 2] = Math.sin(u) * s * radius;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return g;
}

function Stars({ count, upperOnly, color = '#dfe8ff', size = 1.6 }) {
  const geo = useOwned(() => starGeometry(count, 260, upperOnly, 77), [count, upperOnly]);
  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial color={color} size={size} sizeAttenuation={false} fog={false} toneMapped={false} />
    </points>
  );
}

// Night skyline: instanced towers with lit windows surrounding (and below) the rooftop.
function City({ world }) {
  const ref = useRef();
  const COUNT = 130;
  const mat = useOwned(() => new THREE.MeshBasicMaterial({ map: getWindowTexture() }), []);

  useLayoutEffect(() => {
    const rand = rng(world.levelIndex * 31 + 9);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    const hx = world.width / 2 + 7;
    const hz = world.depth / 2 + 7;
    let i = 0;
    let guard = 0;
    while (i < COUNT && guard++ < 4000) {
      const a = rand() * Math.PI * 2;
      const d = 16 + rand() * 120;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const w = 7 + rand() * 12;
      const dp = 7 + rand() * 12;
      if (Math.abs(x) < hx + w / 2 && Math.abs(z) < hz + dp / 2) continue;
      // nearby towers stay below the roof line; distant ones may rise above it
      const top = -34 + rand() * 30 + (d > 60 ? rand() * 34 : 0);
      const bottom = -80;
      m.compose(p.set(x, (top + bottom) / 2, z), q, s.set(w, top - bottom, dp));
      ref.current.setMatrixAt(i, m);
      const v = 0.45 + rand() * 0.55;
      ref.current.setColorAt(i, col.setRGB(v, v, v * (0.9 + rand() * 0.3)));
      i++;
    }
    ref.current.count = i;
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.instanceColor.needsUpdate = true;
  }, [world]);

  return (
    <>
      <instancedMesh ref={ref} args={[unitBox, mat, COUNT]} frustumCulled={false} />
      {/* street glow far below */}
      <mesh geometry={planeGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -80, 0]} scale={700}>
        <meshBasicMaterial color="#3a1c0a" />
      </mesh>
      <Stars count={420} upperOnly />
      <group position={[-90, 70, -170]}>
        <mesh>
          <sphereGeometry args={[9, 20, 14]} />
          <meshBasicMaterial color="#e6ecff" fog={false} toneMapped={false} />
        </mesh>
        <sprite scale={60}>
          <spriteMaterial map={getGlowTexture()} color="#8fa8ff" opacity={0.35} fog={false} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      </group>
    </>
  );
}

// Deep space: dense starfield and a ringed planet drifting past the station.
function Space() {
  const planet = useRef();
  useFrame((_, dt) => {
    planet.current.rotation.y += dt * 0.02;
  });
  return (
    <>
      <Stars count={1100} size={1.7} />
      <Stars count={160} color="#ffb48a" size={2.4} upperOnly />
      <group ref={planet} position={[120, -90, -190]} rotation={[0.35, 0, 0.2]}>
        <mesh>
          <sphereGeometry args={[70, 28, 18]} />
          <meshStandardMaterial color="#3a58c8" emissive="#101c50" roughness={0.9} fog={false} flatShading />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[88, 122, 48]} />
          <meshBasicMaterial color="#ff9a6a" transparent opacity={0.35} side={THREE.DoubleSide} fog={false} depthWrite={false} />
        </mesh>
      </group>
    </>
  );
}

// Reactor pit under the laboratory floor.
function Pit({ world }) {
  const light = useRef();
  useFrame((state) => {
    light.current.intensity = 70 + Math.sin(state.clock.elapsedTime * 2.2) * 25;
  });
  return (
    <>
      <mesh geometry={planeGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -world.theme.cliff, 0]} scale={[world.width, world.depth, 1]}>
        <meshBasicMaterial color="#19e0a8" toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, -3, 0]} color="#3dffb0" intensity={70} distance={26} decay={1.4} />
      <mesh geometry={planeGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -world.theme.cliff - 0.5, 0]} scale={400}>
        <meshBasicMaterial color="#03100e" />
      </mesh>
    </>
  );
}

export function Backdrop({ world }) {
  const kind = world.theme.backdrop;
  if (kind === 'city') return <City world={world} />;
  if (kind === 'stars') return <Space />;
  if (kind === 'pit') return <Pit world={world} />;
  return (
    <mesh geometry={planeGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} scale={300}>
      <meshBasicMaterial color={world.theme.bg} />
    </mesh>
  );
}
