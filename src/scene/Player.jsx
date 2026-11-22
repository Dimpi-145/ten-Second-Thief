import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { runtime } from '../game/runtime.js';
import { FloorGlow } from './Models.jsx';

const bodyGeo = new THREE.CylinderGeometry(0.27, 0.33, 0.72, 8);
const stripeGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.1, 8);
const headGeo = new THREE.IcosahedronGeometry(0.25, 1);
const beanieGeo = new THREE.SphereGeometry(0.265, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
const maskGeo = new THREE.CylinderGeometry(0.258, 0.258, 0.1, 10);
const eyeGeo = new THREE.BoxGeometry(0.08, 0.04, 0.03);
const limbGeo = new THREE.BoxGeometry(0.15, 0.48, 0.17);
const armGeo = new THREE.BoxGeometry(0.12, 0.46, 0.13);
const bagGeo = new THREE.IcosahedronGeometry(0.27, 0);
const bagTieGeo = new THREE.CylinderGeometry(0.05, 0.09, 0.12, 6);

const suitMat = new THREE.MeshStandardMaterial({ color: '#232a55', roughness: 0.6, metalness: 0.1 });
const darkMat = new THREE.MeshStandardMaterial({ color: '#0c0f22', roughness: 0.7 });
const skinMat = new THREE.MeshStandardMaterial({ color: '#f0c19a', roughness: 0.7 });
const bagMat = new THREE.MeshStandardMaterial({ color: '#c9a45c', roughness: 0.85, flatShading: true });
const neonMat = new THREE.MeshBasicMaterial({ color: '#00e5ff', toneMapped: false });

export function Player({ world }) {
  const root = useRef();
  const body = useRef();
  const legL = useRef();
  const legR = useRef();
  const armL = useRef();
  const armR = useRef();

  const fall = useRef(0);

  useFrame((state, dt) => {
    const p = world.player;
    root.current.position.set(p.x, 0, p.z);
    root.current.rotation.y = p.angle;
    // hide the model when looking through the thief's eyes
    body.current.visible = runtime.cam.mode !== 'first';
    const airborne = !!p.jump;
    const run = airborne ? 1 : Math.min(1, p.speed / 6) * (1 - p.float * 0.7);
    const swing = airborne ? 0.9 : Math.sin(p.walk * 2.2) * 0.95 * run;
    legL.current.rotation.x = swing;
    legR.current.rotation.x = -swing;
    armL.current.rotation.x = airborne ? -2.4 : -swing * 0.9;
    armR.current.rotation.x = airborne ? -2.4 : swing * 0.9;

    if (world.fell) {
      // tumbling into the void after stepping off an edge
      fall.current += dt * 22;
      body.current.position.y -= fall.current * dt;
      body.current.rotation.x += dt * 5;
      return;
    }
    const bob = Math.abs(Math.sin(p.walk * 2.2)) * 0.07 * run;
    body.current.position.y = p.y + bob;
    // lean into a run, flip through a jump, drift lazily in zero-g
    const t = state.clock.elapsedTime;
    body.current.rotation.x = airborne
      ? (p.jump.t / p.jump.dur) * Math.PI * 2
      : run * 0.2 + p.float * Math.sin(t * 1.3) * 0.35;
    body.current.rotation.z = p.float * Math.sin(t * 0.9) * 0.3;
  });

  return (
    <group ref={root}>
      <FloorGlow color="#00e5ff" size={2.2} y={0.04} />
      <group ref={body}>
        {/* legs pivot at the hip */}
        <group ref={legL} position={[-0.13, 0.5, 0]}>
          <mesh geometry={limbGeo} material={darkMat} position={[0, -0.25, 0]} castShadow />
        </group>
        <group ref={legR} position={[0.13, 0.5, 0]}>
          <mesh geometry={limbGeo} material={darkMat} position={[0, -0.25, 0]} castShadow />
        </group>
        <mesh geometry={bodyGeo} material={suitMat} position={[0, 0.84, 0]} castShadow />
        <mesh geometry={stripeGeo} material={neonMat} position={[0, 0.6, 0]} />
        <group ref={armL} position={[-0.36, 1.1, 0]}>
          <mesh geometry={armGeo} material={suitMat} position={[0, -0.22, 0]} castShadow />
        </group>
        <group ref={armR} position={[0.36, 1.1, 0]}>
          <mesh geometry={armGeo} material={suitMat} position={[0, -0.22, 0]} castShadow />
        </group>
        {/* head */}
        <group position={[0, 1.42, 0]}>
          <mesh geometry={headGeo} material={skinMat} castShadow />
          <mesh geometry={beanieGeo} material={darkMat} position={[0, 0.03, 0]} />
          <mesh geometry={maskGeo} material={darkMat} position={[0, 0.02, 0]} />
          <mesh geometry={eyeGeo} material={neonMat} position={[-0.09, 0.02, 0.25]} />
          <mesh geometry={eyeGeo} material={neonMat} position={[0.09, 0.02, 0.25]} />
        </group>
        {/* loot bag */}
        <mesh geometry={bagGeo} material={bagMat} position={[0, 0.95, -0.38]} castShadow />
        <mesh geometry={bagTieGeo} material={bagMat} position={[0, 1.22, -0.36]} />
      </group>
      <pointLight color="#7fe9ff" intensity={9} distance={7} decay={1.6} position={[0, 2.2, 0]} />
    </group>
  );
}
