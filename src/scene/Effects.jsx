import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SMOKE_TIME } from '../game/levels.js';
import { runtime } from '../game/runtime.js';
import { getGlowTexture, rng } from '../game/textures.js';

// ---- Pooled particle bursts (treasure sparkles, impacts) ------------------------------------
const MAX = 360;
const HIDDEN_Y = -999;

export function Particles() {
  const points = useRef();
  const sim = useMemo(
    () => ({
      pos: new Float32Array(MAX * 3).fill(HIDDEN_Y),
      col: new Float32Array(MAX * 3),
      vel: new Float32Array(MAX * 3),
      life: new Float32Array(MAX),
      next: 0,
      live: 0,
    }),
    [],
  );
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(sim.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(sim.col, 3));
    return g;
  }, [sim]);

  useEffect(() => {
    const c = new THREE.Color();
    runtime.emit = (x, y, z, color, count, speed) => {
      c.set(color);
      for (let n = 0; n < count; n++) {
        const i = sim.next;
        sim.next = (sim.next + 1) % MAX;
        const a = Math.random() * Math.PI * 2;
        const up = 0.3 + Math.random() * 0.9;
        const s = speed * (0.4 + Math.random() * 0.8);
        sim.pos[i * 3] = x;
        sim.pos[i * 3 + 1] = y;
        sim.pos[i * 3 + 2] = z;
        sim.vel[i * 3] = Math.cos(a) * s;
        sim.vel[i * 3 + 1] = up * speed;
        sim.vel[i * 3 + 2] = Math.sin(a) * s;
        const tint = 0.7 + Math.random() * 0.6;
        sim.col[i * 3] = c.r * tint;
        sim.col[i * 3 + 1] = c.g * tint;
        sim.col[i * 3 + 2] = c.b * tint;
        sim.life[i] = 0.55 + Math.random() * 0.5;
      }
      sim.live = 1;
      geometry.attributes.color.needsUpdate = true;
    };
    return () => {
      runtime.emit = null;
      geometry.dispose();
    };
  }, [sim, geometry]);

  useFrame((_, rawDt) => {
    if (!sim.live) return;
    const dt = Math.min(rawDt, 0.05);
    let any = 0;
    for (let i = 0; i < MAX; i++) {
      if (sim.life[i] <= 0) continue;
      sim.life[i] -= dt;
      const j = i * 3;
      if (sim.life[i] <= 0) {
        sim.pos[j + 1] = HIDDEN_Y;
        continue;
      }
      any = 1;
      sim.vel[j + 1] -= 11 * dt;
      sim.pos[j] += sim.vel[j] * dt;
      sim.pos[j + 1] += sim.vel[j + 1] * dt;
      sim.pos[j + 2] += sim.vel[j + 2] * dt;
      if (sim.pos[j + 1] < 0.06) {
        sim.pos[j + 1] = 0.06;
        sim.vel[j + 1] *= -0.45;
      }
    }
    sim.live = any;
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={getGlowTexture()}
        size={0.42}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        sizeAttenuation
      />
    </points>
  );
}

// ---- Smoke bomb cloud (follows the player while they are hidden) ----------------------------
const puffGeo = new THREE.IcosahedronGeometry(1, 1);
const PUFFS = 11;

export function Smoke({ world }) {
  const root = useRef();
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#aab4e8',
        emissive: '#3a2a78',
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0,
        roughness: 1,
        depthWrite: false,
        flatShading: true,
      }),
    [],
  );
  const puffs = useMemo(() => {
    const rand = rng(99);
    return Array.from({ length: PUFFS }, (_, i) => {
      const a = (i / PUFFS) * Math.PI * 2;
      const r = 0.35 + rand() * 0.75;
      return { x: Math.cos(a) * r, y: 0.5 + rand() * 1.3, z: Math.sin(a) * r, s: 0.55 + rand() * 0.5, w: rand() * 6 };
    });
  }, []);

  useFrame((state) => {
    const active = world.smokeT > 0;
    root.current.visible = active;
    if (!active) return;
    const k = 1 - world.smokeT / SMOKE_TIME; // 0 -> 1 over the lifetime
    const grow = Math.min(1, k * 7);
    const fade = Math.min(1, (1 - k) * 4);
    root.current.position.set(world.player.x, 0, world.player.z);
    root.current.rotation.y = state.clock.elapsedTime * 0.7;
    mat.opacity = 0.62 * fade;
    root.current.children.forEach((m, i) => {
      const p = puffs[i];
      const wob = 1 + Math.sin(state.clock.elapsedTime * 3 + p.w) * 0.12;
      m.scale.setScalar(p.s * grow * wob * (1 + k * 0.5));
    });
  });

  return (
    <group ref={root} visible={false}>
      {puffs.map((p, i) => (
        <mesh key={i} geometry={puffGeo} material={mat} position={[p.x, p.y, p.z]} />
      ))}
    </group>
  );
}
