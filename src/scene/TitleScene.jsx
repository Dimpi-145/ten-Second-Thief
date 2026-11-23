import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../game/store.js';
import { getFloorTexture } from '../game/textures.js';
import { Diamond, FloorGlow, GoldStack, KeyModel } from './Models.jsx';
import { useOwned } from './useOwned.js';

const beamGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 6);
const sheathGeo = new THREE.CylinderGeometry(0.11, 0.11, 1, 8, 1, true);
const coreMat = new THREE.MeshBasicMaterial({ color: '#ff5a6e', toneMapped: false });
const sheathMat = new THREE.MeshBasicMaterial({
  color: '#ff0a2a',
  transparent: true,
  opacity: 0.3,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
});
const stoneMat = new THREE.MeshStandardMaterial({ color: '#141936', roughness: 0.4, metalness: 0.6 });
const pillarMat = new THREE.MeshStandardMaterial({ color: '#232a58', roughness: 0.5, metalness: 0.35 });
const cyanMat = new THREE.MeshBasicMaterial({ color: '#00e5ff', toneMapped: false });
const purpleMat = new THREE.MeshBasicMaterial({ color: '#b14dff', toneMapped: false });
const pillarGeo = new THREE.CylinderGeometry(0.5, 0.58, 7, 10);
const ringGeo = new THREE.TorusGeometry(0.62, 0.05, 6, 22);
const tierGeo = new THREE.CylinderGeometry(1, 1, 1, 8);

const LASERS = [
  { y: 1.2, len: 16, speed: 0.35, tilt: 0.05, phase: 0 },
  { y: 2.2, len: 16, speed: -0.5, tilt: -0.08, phase: 1.3 },
  { y: 3.1, len: 16, speed: 0.27, tilt: 0.12, phase: 2.6 },
  { y: 0.5, len: 16, speed: -0.2, tilt: 0, phase: 4 },
];

// Animated vault showpiece behind the title UI.
export function TitleScene() {
  const shadows = useStore((s) => !s.lowGfx);
  const gem = useRef();
  const lasers = useRef();
  const orbit = useRef();
  const tex = useOwned(() => {
    const t = getFloorTexture().clone();
    t.repeat.set(20, 20);
    t.needsUpdate = true;
    return t;
  }, []);
  const pillars = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        return { x: Math.cos(a) * 9, z: Math.sin(a) * 9, i };
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { camera, size } = state;
    if (camera.view && camera.view.enabled) camera.clearViewOffset();
    if (camera.fov !== 50) {
      camera.fov = 50;
      camera.updateProjectionMatrix();
    }
    const portrait = size.width / size.height < 1;
    const r = portrait ? 13.5 : 9.5;
    const a = t * 0.16;
    camera.position.set(Math.sin(a) * r, 3.6 + Math.sin(t * 0.3) * 0.5, Math.cos(a) * r);
    camera.lookAt(0, portrait ? 2.6 : 2.1, 0);

    gem.current.rotation.y = t * 0.9;
    gem.current.position.y = 2.75 + Math.sin(t * 1.4) * 0.14;
    orbit.current.rotation.y = -t * 0.5;
    lasers.current.children.forEach((g, i) => {
      const l = LASERS[i];
      g.rotation.y = t * l.speed + l.phase;
    });
  });

  return (
    <>
      <color attach="background" args={['#04050c']} />
      <fog attach="fog" args={['#070818', 9, 30]} />
      <ambientLight intensity={0.7} color="#5560b8" />
      <hemisphereLight args={['#6a7cff', '#12061f', 0.6]} />
      <directionalLight position={[5, 12, 6]} intensity={1.3} color="#aab8ff" castShadow={shadows} shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-5, 3, 3]} color="#00e5ff" intensity={90} distance={22} decay={1.7} />
      <pointLight position={[5, 3, -3]} color="#b14dff" intensity={90} distance={22} decay={1.7} />
      <pointLight position={[0, 4.6, 0]} color="#9ff3ff" intensity={30} distance={10} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial map={tex} roughness={0.3} metalness={0.5} />
      </mesh>

      {/* stepped pedestal */}
      <mesh geometry={tierGeo} material={stoneMat} position={[0, 0.2, 0]} scale={[2.2, 0.4, 2.2]} castShadow receiveShadow />
      <mesh geometry={tierGeo} material={stoneMat} position={[0, 0.6, 0]} scale={[1.5, 0.4, 1.5]} castShadow receiveShadow />
      <mesh geometry={tierGeo} material={stoneMat} position={[0, 1.2, 0]} scale={[0.8, 0.8, 0.8]} castShadow receiveShadow />
      <mesh geometry={ringGeo} material={cyanMat} position={[0, 0.82, 0]} rotation={[Math.PI / 2, 0, 0]} scale={2.45} />
      <mesh geometry={ringGeo} material={purpleMat} position={[0, 1.62, 0]} rotation={[Math.PI / 2, 0, 0]} scale={1.32} />
      <FloorGlow color="#00e5ff" size={12} />

      <group ref={gem} position={[0, 2.75, 0]}>
        <Diamond scale={2.1} />
      </group>

      <group ref={orbit} position={[0, 1.1, 0]}>
        <GoldStack position={[2.9, 0, 0]} scale={1.3} />
        <GoldStack position={[-2.9, 0, 0]} scale={1.3} rotation={[0, 1, 0]} />
        <KeyModel position={[0, 0.7, 2.9]} scale={1.7} rotation={[0, 0, 0.5]} />
        <Diamond position={[0, 0.5, -2.9]} scale={0.9} />
      </group>

      <group ref={lasers}>
        {LASERS.map((l, i) => (
          <group key={i} position={[0, l.y, 0]}>
            <group rotation={[0, 0, Math.PI / 2 + l.tilt]} position={[0, 0, 3.4]} scale={[1, l.len, 1]}>
              <mesh geometry={beamGeo} material={coreMat} />
              <mesh geometry={sheathGeo} material={sheathMat} />
            </group>
          </group>
        ))}
      </group>

      {pillars.map((p) => (
        <group key={p.i} position={[p.x, 0, p.z]}>
          <mesh geometry={pillarGeo} material={pillarMat} position={[0, 3.5, 0]} castShadow />
          <mesh
            geometry={ringGeo}
            material={p.i % 2 ? purpleMat : cyanMat}
            position={[0, 0.6, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />
          <mesh
            geometry={ringGeo}
            material={p.i % 2 ? purpleMat : cyanMat}
            position={[0, 4.2, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </group>
      ))}
    </>
  );
}
