// Loot skins and mission-target models used by the newer worlds.
import * as THREE from 'three';
import { Diamond, GoldStack, KeyModel } from './Models.jsx';
import { ghost, glow, std } from './env/materials.js';

const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 16);
const ring = new THREE.TorusGeometry(1, 0.08, 6, 24);
const octa = new THREE.OctahedronGeometry(1, 0);
const ico = new THREE.IcosahedronGeometry(1, 0);

const cashMat = std('#35b866', 0.7, 0, { emissive: '#0f5a2a', emissiveIntensity: 0.5 });
const bandMat = std('#f4f0dc', 0.8, 0);
const goldMat = std('#ffc531', 0.22, 1, { emissive: '#a85f00', emissiveIntensity: 0.45 });
const crystalMat = std('#d9b8ff', 0.05, 0.9, { emissive: '#8a2dff', emissiveIntensity: 0.9, flatShading: true });

export function CashStack(props) {
  return (
    <group {...props}>
      {[-0.22, -0.04, 0.14].map((y, i) => (
        <group key={y} position={[i === 1 ? 0.04 : 0, y, 0]} rotation={[0, i * 0.25, 0]}>
          <mesh geometry={box} material={cashMat} scale={[0.66, 0.17, 0.34]} castShadow />
          <mesh geometry={box} material={bandMat} scale={[0.14, 0.175, 0.345]} />
        </group>
      ))}
    </group>
  );
}

const CHIP_COLORS = ['#ff2d95', '#ffffff', '#00e5ff', '#ffc531', '#ff2d95'];
export function ChipStack(props) {
  return (
    <group {...props}>
      {CHIP_COLORS.map((c, i) => (
        <mesh
          key={i}
          geometry={cyl}
          material={std(c, 0.35, 0.3, { emissive: c, emissiveIntensity: 0.35 })}
          position={[Math.sin(i * 2.1) * 0.03, -0.3 + i * 0.11, Math.cos(i * 1.7) * 0.03]}
          scale={[0.3, 0.1, 0.3]}
          castShadow
        />
      ))}
    </group>
  );
}

export function Crystal(props) {
  return (
    <group {...props}>
      <mesh geometry={octa} material={crystalMat} scale={[0.3, 0.62, 0.3]} castShadow />
      <mesh geometry={octa} material={crystalMat} position={[0.26, -0.18, 0.05]} rotation={[0, 0, -0.5]} scale={[0.15, 0.32, 0.15]} />
      <mesh geometry={octa} material={crystalMat} position={[-0.22, -0.22, -0.08]} rotation={[0.2, 0, 0.5]} scale={[0.13, 0.27, 0.13]} />
    </group>
  );
}

export function KeyCard(props) {
  return (
    <group {...props}>
      <mesh geometry={box} material={std('#fff3c4', 0.3, 0.4, { emissive: '#ffc531', emissiveIntensity: 1.1 })} scale={[0.62, 0.4, 0.04]} />
      <mesh geometry={box} material={glow('#1c4a3a')} position={[0, 0.08, 0.025]} scale={[0.62, 0.08, 0.01]} />
      <mesh geometry={box} material={glow('#c9a13a')} position={[-0.16, -0.08, 0.025]} scale={[0.16, 0.12, 0.01]} />
    </group>
  );
}

export const LOOT = { diamond: Diamond, gold: GoldStack, cash: CashStack, chips: ChipStack, crystal: Crystal };
export const LOOT_COLOR = { diamond: '#00e5ff', gold: '#ffb400', cash: '#3dff8a', chips: '#ff2d95', crystal: '#b14dff' };
export const KEYS = { key: KeyModel, card: KeyCard };

// ---- Mission targets -------------------------------------------------------------------------
// Pallet of bullion for the bank vault.
export function Bullion() {
  const bars = [];
  const rows = [3, 2, 1];
  rows.forEach((n, layer) => {
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 2; k++) {
        bars.push([(i - (n - 1) / 2) * 0.44, 0.3 + layer * 0.21, (k - 0.5) * 0.72, layer]);
      }
    }
  });
  return (
    <>
      <mesh geometry={box} material={std('#4a3320', 0.8, 0)} position={[0, 0.09, 0]} scale={[1.5, 0.18, 1.6]} castShadow receiveShadow />
      {bars.map(([x, y, z], i) => (
        <mesh key={i} geometry={box} material={goldMat} position={[x, y, z]} scale={[0.4, 0.19, 0.66]} castShadow />
      ))}
    </>
  );
}

// Oversized golden chip for the casino.
export function GoldenChip() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh geometry={cyl} material={goldMat} scale={[0.48, 0.1, 0.48]} castShadow />
      <mesh geometry={ring} material={glow('#fff2b0')} rotation={[Math.PI / 2, 0, 0]} scale={0.48} />
      <mesh geometry={cyl} material={glow('#ff2d95')} scale={[0.26, 0.11, 0.26]} />
      <mesh geometry={octa} material={glow('#ffffff')} scale={[0.13, 0.13, 0.13]} />
    </group>
  );
}

// Hackable terminal for the lab (stays in place; its screen flips from red to green).
export function Terminal({ screenMat }) {
  const body = std('#2a3438', 0.4, 0.7);
  return (
    <>
      <mesh geometry={box} material={body} position={[0, 0.5, 0]} scale={[0.8, 1, 0.5]} castShadow receiveShadow />
      <group position={[0, 1.2, 0]} rotation={[-0.35, 0, 0]}>
        <mesh geometry={box} material={body} scale={[0.95, 0.62, 0.1]} castShadow />
        <mesh geometry={box} material={screenMat} position={[0, 0, 0.06]} scale={[0.82, 0.48, 0.01]} />
        <mesh geometry={box} material={screenMat} position={[0, 0, -0.06]} scale={[0.82, 0.48, 0.01]} />
      </group>
      <mesh geometry={box} material={std('#c8d4d8', 0.5, 0.3)} position={[0, 1.01, 0.32]} rotation={[0.25, 0, 0]} scale={[0.7, 0.04, 0.26]} />
      <mesh geometry={box} material={screenMat} position={[0, 0.5, 0.26]} scale={[0.5, 0.06, 0.01]} />
    </>
  );
}

// Energy core for the space vault (also the generic fallback target).
export function Core({ color = '#ff8a3d' }) {
  return (
    <>
      <mesh geometry={ico} material={glow('#fff0d0')} scale={0.26} />
      <mesh geometry={ico} material={ghost(color, 0.55)} scale={0.42} />
      <mesh geometry={ring} material={glow(color)} scale={0.6} />
      <mesh geometry={ring} material={glow('#4d7cff')} rotation={[Math.PI / 2, 0, 0]} scale={0.7} />
    </>
  );
}
