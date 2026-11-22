import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GUARD_HALF_ANGLE, GUARD_RANGE } from '../game/simulation.js';
import { std } from './env/materials.js';

const bodyGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.8, 8);
const headGeo = new THREE.IcosahedronGeometry(0.24, 1);
const capGeo = new THREE.CylinderGeometry(0.26, 0.27, 0.14, 10);
const brimGeo = new THREE.BoxGeometry(0.4, 0.04, 0.22);
const limbGeo = new THREE.BoxGeometry(0.17, 0.5, 0.19);
const armGeo = new THREE.BoxGeometry(0.13, 0.5, 0.14);
const badgeGeo = new THREE.BoxGeometry(0.34, 0.1, 0.04);
const torchGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.3, 6);
const alertGeo = new THREE.OctahedronGeometry(0.17, 0);
const box = new THREE.BoxGeometry(1, 1, 1);
const rotorGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.02, 10);
const eyeGeo = new THREE.SphereGeometry(0.11, 10, 8);
const beamGeo = new THREE.ConeGeometry(0.9, 2.1, 12, 1, true);
// Vision fan lies flat on the floor, centred on the guard's local +z (forward).
const coneGeo = new THREE.CircleGeometry(GUARD_RANGE, 20, -Math.PI / 2 - GUARD_HALF_ANGLE, GUARD_HALF_ANGLE * 2);

const darkMat = new THREE.MeshStandardMaterial({ color: '#0e142e', roughness: 0.7 });
const skinMat = new THREE.MeshStandardMaterial({ color: '#e0ac86', roughness: 0.7 });
const alertMat = new THREE.MeshBasicMaterial({ color: '#ff2545', toneMapped: false });

const CALM = new THREE.Color('#ffd666');
const WARY = new THREE.Color('#ff9a2e');
const HOSTILE = new THREE.Color('#ff1a3c');
const SEARCH = new THREE.Color('#b14dff');

function useAlertMaterials() {
  return useMemo(
    () => ({
      coneMat: new THREE.MeshBasicMaterial({
        color: CALM, transparent: true, opacity: 0.2, depthWrite: false,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
      }),
      badgeMat: new THREE.MeshBasicMaterial({ color: CALM, toneMapped: false }),
    }),
    [],
  );
}

// Shared per-frame colouring of the vision cone / status light.
function tint(g, coneMat, badgeMat) {
  const chasing = g.state === 'chase';
  const target = chasing ? HOSTILE : g.state === 'search' ? SEARCH : g.alert > 0.05 ? WARY : CALM;
  coneMat.color.lerp(target, 0.2);
  coneMat.opacity = chasing ? 0.34 : 0.16 + g.alert * 0.16;
  badgeMat.color.copy(coneMat.color);
  return chasing;
}

function Guard({ g, color }) {
  const root = useRef();
  const legL = useRef();
  const legR = useRef();
  const armL = useRef();
  const mark = useRef();
  const { coneMat, badgeMat } = useAlertMaterials();
  const uniformMat = std(color, 0.6, 0);

  useFrame((state) => {
    root.current.position.set(g.x, 0, g.z);
    root.current.rotation.y = g.angle;
    const swing = Math.sin(g.walk * 2) * 0.7 * g.moving;
    legL.current.rotation.x = swing;
    legR.current.rotation.x = -swing;
    armL.current.rotation.x = -swing;
    const chasing = tint(g, coneMat, badgeMat);
    mark.current.visible = chasing;
    if (chasing) {
      mark.current.rotation.y = state.clock.elapsedTime * 6;
      mark.current.position.y = 2.25 + Math.sin(state.clock.elapsedTime * 10) * 0.07;
    }
  });

  return (
    <group ref={root}>
      <mesh geometry={coneGeo} material={coneMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} />
      <group ref={legL} position={[-0.15, 0.52, 0]}>
        <mesh geometry={limbGeo} material={darkMat} position={[0, -0.26, 0]} castShadow />
      </group>
      <group ref={legR} position={[0.15, 0.52, 0]}>
        <mesh geometry={limbGeo} material={darkMat} position={[0, -0.26, 0]} castShadow />
      </group>
      <mesh geometry={bodyGeo} material={uniformMat} position={[0, 0.92, 0]} castShadow />
      <mesh geometry={badgeGeo} material={badgeMat} position={[0, 1.08, 0.33]} />
      <group ref={armL} position={[-0.4, 1.22, 0]}>
        <mesh geometry={armGeo} material={uniformMat} position={[0, -0.24, 0]} castShadow />
      </group>
      {/* right arm holds a torch pointing forward */}
      <group position={[0.4, 1.22, 0]} rotation={[-1.2, 0, 0]}>
        <mesh geometry={armGeo} material={uniformMat} position={[0, -0.24, 0]} castShadow />
        <mesh geometry={torchGeo} material={badgeMat} position={[0, -0.56, 0]} />
      </group>
      <group position={[0, 1.56, 0]}>
        <mesh geometry={headGeo} material={skinMat} castShadow />
        <mesh geometry={capGeo} material={darkMat} position={[0, 0.2, 0]} />
        <mesh geometry={brimGeo} material={darkMat} position={[0, 0.14, 0.24]} />
      </group>
      <mesh ref={mark} geometry={alertGeo} material={alertMat} position={[0, 2.25, 0]} visible={false} />
    </group>
  );
}

// Quad-rotor patrol drone: hovers, ignores obstacles and sweeps a searchlight.
function Drone({ g }) {
  const root = useRef();
  const hull = useRef();
  const rotors = useRef();
  const { coneMat, badgeMat } = useAlertMaterials();
  const shell = std('#2a2e38', 0.35, 0.8);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    root.current.position.set(g.x, 0, g.z);
    root.current.rotation.y = g.angle;
    hull.current.position.y = 2.3 + Math.sin(t * 2.6 + g.path[0].x) * 0.12;
    hull.current.rotation.x = g.moving * 0.22;
    rotors.current.children.forEach((r) => {
      r.rotation.y += dt * 38;
    });
    tint(g, coneMat, badgeMat);
  });

  return (
    <group ref={root}>
      <mesh geometry={coneGeo} material={coneMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} />
      <group ref={hull} position={[0, 2.3, 0]}>
        <mesh geometry={box} material={shell} scale={[0.5, 0.2, 0.62]} castShadow />
        <mesh geometry={box} material={shell} rotation={[0, Math.PI / 4, 0]} scale={[1.3, 0.05, 0.08]} castShadow />
        <mesh geometry={box} material={shell} rotation={[0, -Math.PI / 4, 0]} scale={[1.3, 0.05, 0.08]} castShadow />
        <group ref={rotors}>
          {[[0.46, 0.46], [-0.46, 0.46], [0.46, -0.46], [-0.46, -0.46]].map(([x, z]) => (
            <mesh key={`${x}${z}`} geometry={rotorGeo} material={coneMat} position={[x, 0.07, z]} />
          ))}
        </group>
        <mesh geometry={eyeGeo} material={badgeMat} position={[0, -0.08, 0.3]} />
        {/* searchlight shaft down to the vision fan */}
        <mesh geometry={beamGeo} material={coneMat} position={[0, -1.1, 0.5]} rotation={[0.42, 0, 0]} />
      </group>
    </group>
  );
}

export function Guards({ world }) {
  return world.guards.map((g, i) =>
    g.fly ? <Drone key={i} g={g} /> : <Guard key={i} g={g} color={world.theme.guard} />,
  );
}
