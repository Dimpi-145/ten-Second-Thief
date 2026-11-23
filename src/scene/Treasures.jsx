import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloorGlow } from './Models.jsx';
import { Bullion, Core, GoldenChip, KEYS, LOOT, LOOT_COLOR, Terminal } from './ModelsExtra.jsx';
import { ghost, std } from './env/materials.js';
import { useOwned } from './useOwned.js';

const pedestalGeo = new THREE.CylinderGeometry(0.34, 0.42, 0.3, 8);
const markerGeo = new THREE.CylinderGeometry(0.05, 0.4, 4.4, 10, 1, true);
const pedestalMat = new THREE.MeshStandardMaterial({ color: '#161b3a', roughness: 0.4, metalness: 0.5 });

function Item({ item, skin }) {
  const root = useRef();
  const spin = useRef();
  const Model = LOOT[skin] || LOOT.gold;
  useFrame((state) => {
    if (item.collected) {
      root.current.visible = false;
      return;
    }
    const t = state.clock.elapsedTime + item.phase;
    if (item.zero) {
      // zero gravity: loot drifts high and tumbles on every axis
      spin.current.rotation.set(t * 0.7, t * 1.1, t * 0.5);
      spin.current.position.y = 1.7 + Math.sin(t * 1.1) * 0.35;
    } else {
      spin.current.rotation.y = t * 1.8;
      spin.current.position.y = 1.0 + Math.sin(t * 2.4) * 0.1;
    }
  });
  return (
    <group ref={root} position={[item.x, 0, item.z]}>
      {!item.zero && <mesh geometry={pedestalGeo} material={pedestalMat} position={[0, 0.15, 0]} receiveShadow />}
      <FloorGlow color={LOOT_COLOR[skin] || '#ffb400'} size={2.6} />
      <group ref={spin}>
        <Model scale={0.95} />
      </group>
    </group>
  );
}

function Key({ item, model, color }) {
  const root = useRef();
  const spin = useRef();
  const Model = KEYS[model] || KEYS.key;
  useFrame((state) => {
    if (item.collected) {
      root.current.visible = false;
      return;
    }
    const t = state.clock.elapsedTime;
    spin.current.rotation.y = t * 2.6;
    spin.current.position.y = 1.15 + Math.sin(t * 3) * 0.12;
  });
  return (
    <group ref={root} position={[item.x, 0, item.z]}>
      {/* glow disc instead of a real light: every extra point light is paid for by every pixel,
          and hiding one on pickup would recompile every shader mid-run */}
      <FloorGlow color={color} size={4.4} />
      <group ref={spin}>
        <Model scale={1.35} rotation={[0, 0, model === 'card' ? 0.2 : 0.5]} />
      </group>
    </group>
  );
}

// Mission-critical objective object (bullion, golden chip, terminal, energy core).
function Target({ target, kind, accent }) {
  const root = useRef();
  const spin = useRef();
  const beam = useRef();
  const screenMat = useOwned(() => new THREE.MeshBasicMaterial({ color: '#ff3a4d', toneMapped: false }), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (kind === 'terminal') {
      screenMat.color.set(target.collected ? '#2dffa0' : Math.sin(t * 6) > 0 ? '#ff3a4d' : '#a01828');
      beam.current.visible = !target.collected;
      return;
    }
    if (target.collected) {
      root.current.visible = false;
      return;
    }
    if (kind === 'bullion') return;
    spin.current.rotation.y = t * (kind === 'chip' ? 2.2 : 1.2);
    if (kind === 'core') spin.current.rotation.x = t * 0.8;
    spin.current.position.y = (target.zero ? 1.8 : 1.25) + Math.sin(t * 2) * (target.zero ? 0.3 : 0.12);
  });
  return (
    <group ref={root} position={[target.x, 0, target.z]}>
      <FloorGlow color={accent} size={5} />
      {/* tall marker beam so the objective reads from across the room */}
      <mesh ref={beam} geometry={markerGeo} material={ghost(accent, 0.16)} position={[0, 2.4, 0]} />
      {kind === 'bullion' && <Bullion />}
      {kind === 'terminal' && <Terminal screenMat={screenMat} />}
      {(kind === 'chip' || kind === 'core') && (
        <group ref={spin} position={[0, 1.25, 0]}>
          {kind === 'chip' ? <GoldenChip /> : <Core />}
        </group>
      )}
    </group>
  );
}

const postGeo = new THREE.BoxGeometry(0.22, 2.6, 0.22);
const lintelGeo = new THREE.BoxGeometry(1.9, 0.24, 0.26);
const padGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.06, 24);
const ringGeo = new THREE.TorusGeometry(0.8, 0.05, 6, 28);
const beamGeo = new THREE.CylinderGeometry(0.78, 0.78, 3, 20, 1, true);
const gateGeo = new THREE.PlaneGeometry(1.5, 2.3);
const box = new THREE.BoxGeometry(1, 1, 1);
const LOCKED = new THREE.Color('#ff2545');
const OPEN = new THREE.Color('#2dffa0');

function Exit({ world }) {
  const ring = useRef();
  const light = useRef();
  const helipad = world.theme.exit === 'helipad';
  const { glowMat, beamMat } = useOwned(
    () => ({
      glowMat: new THREE.MeshBasicMaterial({ color: LOCKED, toneMapped: false }),
      beamMat: new THREE.MeshBasicMaterial({
        color: LOCKED, transparent: true, opacity: 0.12, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      }),
    }),
    [],
  );
  const frameMat = std('#0e1228', 0.4, 0.7);

  useFrame((state, dt) => {
    const open = world.exitOpen;
    glowMat.color.lerp(open ? OPEN : LOCKED, 0.15);
    beamMat.color.copy(glowMat.color);
    const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * (open ? 6 : 2.5));
    beamMat.opacity = open ? 0.16 + pulse * 0.16 : 0.07 + pulse * 0.05;
    ring.current.rotation.z += dt * (open ? 3 : 0.6);
    light.current.color.copy(glowMat.color);
    light.current.intensity = open ? 26 + pulse * 14 : 10;
  });

  const { x, z } = world.exit;
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={padGeo} material={frameMat} position={[0, 0.03, 0]} receiveShadow />
      <mesh ref={ring} geometry={ringGeo} material={glowMat} position={[0, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={beamGeo} material={beamMat} position={[0, 1.5, 0]} />
      {helipad ? (
        // painted "H" and corner beacons
        <group position={[0, 0.07, 0]}>
          <mesh geometry={box} material={glowMat} position={[-0.3, 0, 0]} scale={[0.12, 0.02, 0.8]} />
          <mesh geometry={box} material={glowMat} position={[0.3, 0, 0]} scale={[0.12, 0.02, 0.8]} />
          <mesh geometry={box} material={glowMat} scale={[0.6, 0.02, 0.12]} />
          {[[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].map(([px, pz]) => (
            <group key={`${px}${pz}`} position={[px, 0, pz]}>
              <mesh geometry={box} material={frameMat} position={[0, 0.2, 0]} scale={[0.1, 0.4, 0.1]} />
              <mesh geometry={box} material={glowMat} position={[0, 0.45, 0]} scale={0.12} />
            </group>
          ))}
        </group>
      ) : (
        <group position={[0, 0, -0.78]}>
          <mesh geometry={postGeo} material={frameMat} position={[-0.85, 1.3, 0]} castShadow />
          <mesh geometry={postGeo} material={frameMat} position={[0.85, 1.3, 0]} castShadow />
          <mesh geometry={lintelGeo} material={frameMat} position={[0, 2.7, 0]} castShadow />
          <mesh geometry={lintelGeo} material={glowMat} position={[0, 2.5, 0.04]} scale={[0.8, 0.3, 0.6]} />
          <mesh geometry={gateGeo} material={beamMat} position={[0, 1.25, 0]} />
        </group>
      )}
      <pointLight ref={light} color="#ff2545" intensity={10} distance={7} position={[0, 1.6, 0.3]} />
    </group>
  );
}

export function Treasures({ world }) {
  const { theme } = world;
  return (
    <>
      {world.items.map((it, i) => (
        <Item key={i} item={it} skin={theme.loot[it.kind]} />
      ))}
      {world.key && <Key item={world.key} model={theme.keyModel} color={theme.keyModel === 'card' ? '#ffc531' : '#b14dff'} />}
      {world.targets.map((t, i) => (
        <Target key={`t${i}`} target={t} kind={theme.target} accent={theme.accent2} />
      ))}
      <Exit world={world} />
    </>
  );
}
