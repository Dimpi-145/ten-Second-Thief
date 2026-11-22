import * as THREE from 'three';
import { getGlowTexture } from '../game/textures.js';

// ---- Shared geometry / materials for collectibles -------------------------------------------
const crownGeo = new THREE.CylinderGeometry(0.2, 0.42, 0.2, 8);
const pavilionGeo = new THREE.ConeGeometry(0.42, 0.55, 8);
const diamondMat = new THREE.MeshStandardMaterial({
  color: '#bff6ff',
  emissive: '#00c8ff',
  emissiveIntensity: 0.55,
  roughness: 0.04,
  metalness: 0.9,
  flatShading: true,
});

const barGeo = new THREE.BoxGeometry(0.62, 0.2, 0.3);
const goldMat = new THREE.MeshStandardMaterial({
  color: '#ffc531',
  emissive: '#a85f00',
  emissiveIntensity: 0.45,
  roughness: 0.22,
  metalness: 1,
});

const keyRingGeo = new THREE.TorusGeometry(0.2, 0.06, 6, 14);
const keyShaftGeo = new THREE.BoxGeometry(0.09, 0.5, 0.09);
const keyToothGeo = new THREE.BoxGeometry(0.2, 0.09, 0.09);
const keyMat = new THREE.MeshStandardMaterial({
  color: '#e6c0ff',
  emissive: '#b14dff',
  emissiveIntensity: 1.4,
  roughness: 0.2,
  metalness: 0.8,
});

const glowGeo = new THREE.PlaneGeometry(1, 1);
const glowMats = {};
function glowMat(color) {
  if (!glowMats[color]) {
    glowMats[color] = new THREE.MeshBasicMaterial({
      map: getGlowTexture(),
      color,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
  }
  return glowMats[color];
}

// Soft additive disc on the floor that sells the "glow" without post-processing.
export function FloorGlow({ color, size = 2.4, y = 0.03 }) {
  return (
    <mesh
      geometry={glowGeo}
      material={glowMat(color)}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, y, 0]}
      scale={size}
    />
  );
}

export function Diamond(props) {
  return (
    <group {...props}>
      <mesh geometry={crownGeo} material={diamondMat} position={[0, 0.1, 0]} castShadow />
      <mesh geometry={pavilionGeo} material={diamondMat} position={[0, -0.275, 0]} rotation={[Math.PI, 0, 0]} castShadow />
    </group>
  );
}

export function GoldStack(props) {
  return (
    <group {...props}>
      <mesh geometry={barGeo} material={goldMat} position={[-0.17, -0.2, 0]} castShadow />
      <mesh geometry={barGeo} material={goldMat} position={[0.17, -0.2, 0.02]} rotation={[0, 0.5, 0]} castShadow />
      <mesh geometry={barGeo} material={goldMat} position={[0, 0.01, 0]} rotation={[0, -0.3, 0]} castShadow />
    </group>
  );
}

export function KeyModel(props) {
  return (
    <group {...props}>
      <mesh geometry={keyRingGeo} material={keyMat} position={[0, 0.3, 0]} />
      <mesh geometry={keyShaftGeo} material={keyMat} position={[0, -0.1, 0]} />
      <mesh geometry={keyToothGeo} material={keyMat} position={[0.1, -0.3, 0]} />
      <mesh geometry={keyToothGeo} material={keyMat} position={[0.08, -0.14, 0]} scale={[0.7, 1, 1]} />
    </group>
  );
}
