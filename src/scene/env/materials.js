import * as THREE from 'three';

// Shared, cached materials so every world reuses the same GPU programs.
const cache = new Map();

export function std(color, rough = 0.5, metal = 0.2, extra) {
  const key = `s|${color}|${rough}|${metal}|${extra ? JSON.stringify(extra) : ''}`;
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra }));
  }
  return cache.get(key);
}

// Unlit, un-tonemapped colour: reads as a light source / neon tube.
export function glow(color) {
  const key = `g|${color}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  return cache.get(key);
}

// Transparent additive glow (holograms, beams, liquid).
export function ghost(color, opacity = 0.3) {
  const key = `h|${color}|${opacity}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
  }
  return cache.get(key);
}
