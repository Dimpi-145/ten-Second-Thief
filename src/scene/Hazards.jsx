import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CAM_HALF_ANGLE, CAM_RANGE } from '../game/simulation.js';
import { useOwned } from './useOwned.js';

// ---- Lasers ---------------------------------------------------------------------------------
const beamGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 6);
beamGeo.rotateZ(Math.PI / 2); // lie along local x
const sheathGeo = new THREE.CylinderGeometry(0.13, 0.13, 1, 8, 1, true);
sheathGeo.rotateZ(Math.PI / 2);
const floorLineGeo = new THREE.PlaneGeometry(1, 0.5);
const pylonGeo = new THREE.BoxGeometry(0.2, 1.5, 0.2);
const emitterGeo = new THREE.BoxGeometry(0.26, 0.12, 0.26);
const hubGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.16, 16);
const pylonMat = new THREE.MeshStandardMaterial({ color: '#12162e', roughness: 0.4, metalness: 0.8 });
const HEIGHTS = [0.35, 0.8, 1.25];

function Laser({ l, colors }) {
  const root = useRef();
  const beams = useRef();
  const spin = l.type === 'spin';
  const { coreMat, sheathMat, floorMat } = useOwned(() => {
    const soft = {
      color: colors[1], transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
    };
    return {
      coreMat: new THREE.MeshBasicMaterial({ color: colors[0], toneMapped: false }),
      sheathMat: new THREE.MeshBasicMaterial({ ...soft, opacity: 0.3 }),
      floorMat: new THREE.MeshBasicMaterial({ ...soft, opacity: 0.22 }),
    };
  }, [colors]);
  const len = Math.hypot(l.bx - l.ax, l.bz - l.az);

  useFrame((state) => {
    root.current.position.set((l.ax + l.bx) / 2, 0, (l.az + l.bz) / 2);
    root.current.rotation.y = Math.atan2(-(l.bz - l.az), l.bx - l.ax);
    const flicker = l.warn && Math.sin(state.clock.elapsedTime * 60) > 0;
    beams.current.visible = l.active || flicker;
    const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 9);
    sheathMat.opacity = l.active ? 0.24 + pulse * 0.14 : 0.1;
    floorMat.opacity = l.active ? 0.2 + pulse * 0.08 : 0.06;
  });

  return (
    <>
      <group ref={root}>
        <group ref={beams}>
          {HEIGHTS.map((h) => (
            <group key={h} position={[0, h, 0]} scale={[len, 1, 1]}>
              <mesh geometry={beamGeo} material={coreMat} />
              <mesh geometry={sheathGeo} material={sheathMat} />
            </group>
          ))}
          <mesh geometry={floorLineGeo} material={floorMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]} scale={[len, 1, 1]} />
        </group>
        {(spin ? [1] : [-1, 1]).map((s) => (
          <group key={s} position={[(s * len) / 2, 0, 0]}>
            <mesh geometry={pylonGeo} material={pylonMat} position={[0, 0.75, 0]} castShadow />
            <mesh geometry={emitterGeo} material={coreMat} position={[0, 1.56, 0]} />
          </group>
        ))}
      </group>
      {/* rotating lasers pivot on a glowing hub (usually wrapped around a pillar) */}
      {spin && (
        <group position={[l.cx, 0, l.cz]}>
          <mesh geometry={hubGeo} material={pylonMat} position={[0, 0.08, 0]} />
          <mesh geometry={hubGeo} material={coreMat} position={[0, 0.8, 0]} scale={[0.98, 0.3, 0.98]} />
        </group>
      )}
    </>
  );
}

export function Lasers({ world }) {
  return world.lasers.map((l, i) => <Laser key={i} l={l} colors={world.theme.laser} />);
}

// ---- Security cameras -----------------------------------------------------------------------
const camBodyGeo = new THREE.BoxGeometry(0.3, 0.26, 0.62);
const camLensGeo = new THREE.CylinderGeometry(0.1, 0.13, 0.14, 8);
camLensGeo.rotateX(Math.PI / 2);
const camMountGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6);
const camLedGeo = new THREE.SphereGeometry(0.05, 6, 6);
const camFanGeo = new THREE.CircleGeometry(CAM_RANGE, 18, -Math.PI / 2 - CAM_HALF_ANGLE, CAM_HALF_ANGLE * 2);
const camMat = new THREE.MeshStandardMaterial({ color: '#d8dcf0', roughness: 0.35, metalness: 0.6 });
const camDarkMat = new THREE.MeshStandardMaterial({ color: '#0b0d1c', roughness: 0.3, metalness: 0.8 });
const SCAN = new THREE.Color('#b14dff');
const ALERT = new THREE.Color('#ff1a3c');

function SecurityCamera({ cam, world }) {
  const pivot = useRef();
  const { fanMat, ledMat } = useOwned(
    () => ({
      fanMat: new THREE.MeshBasicMaterial({
        color: SCAN, transparent: true, opacity: 0.2, depthWrite: false,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
      }),
      ledMat: new THREE.MeshBasicMaterial({ color: SCAN, toneMapped: false }),
    }),
    [],
  );

  useFrame(() => {
    pivot.current.rotation.y = cam.angle;
    const hot = cam.seeing || world.alarm > 0;
    fanMat.color.lerp(hot ? ALERT : SCAN, 0.25);
    fanMat.opacity = hot ? 0.36 : 0.2;
    ledMat.color.copy(fanMat.color);
  });

  return (
    <group position={[cam.x, 0, cam.z]}>
      <mesh geometry={camMountGeo} material={camDarkMat} position={[0, 2.75, 0]} />
      <group ref={pivot}>
        <mesh geometry={camFanGeo} material={fanMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} />
        <group position={[0, 2.45, 0.1]} rotation={[0.45, 0, 0]}>
          <mesh geometry={camBodyGeo} material={camMat} castShadow />
          <mesh geometry={camLensGeo} material={camDarkMat} position={[0, 0, 0.36]} />
          <mesh geometry={camLedGeo} material={ledMat} position={[0.1, 0.16, 0.25]} />
        </group>
      </group>
    </group>
  );
}

export function SecurityCameras({ world }) {
  return world.cameras.map((c, i) => <SecurityCamera key={i} cam={c} world={world} />);
}
