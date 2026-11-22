import * as THREE from 'three';

// Small deterministic PRNG so procedural art is stable between renders.
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function finish(c, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Each floor texture is a 2x2 block of tiles; one texture repeat covers 2x2 map cells.
const FLOORS = {
  // dark polished marble with glowing cyan seams
  marble: { a: '#141a36', b: '#0c1024', seam: 'rgba(0,229,255,0.28)', vein: [120, 140, 255] },
  // deep green marble with brass inlay
  bank: { a: '#17382e', b: '#0f2921', seam: 'rgba(255,197,49,0.45)', vein: [200, 230, 190] },
  // patterned casino carpet
  carpet: { a: '#2a0f40', b: '#200a33', seam: 'rgba(255,197,49,0.0)', motif: '#ffc531', motif2: '#ff2d95' },
  // gravel rooftop
  roof: { a: '#2b2f39', b: '#272a33', seam: 'rgba(0,0,0,0.5)', gravel: true },
  // bright clinical lab tiles
  lab: { a: '#a9b9c2', b: '#99abb5', seam: 'rgba(20,90,80,0.55)', hazard: '#1d7a66' },
  // riveted deck plates
  space: { a: '#1c2233', b: '#161b2a', seam: 'rgba(77,124,255,0.5)', rivets: true },
};

const floorCache = {};
export function getFloorTexture(style = 'marble') {
  if (floorCache[style]) return floorCache[style];
  const cfg = FLOORS[style] || FLOORS.marble;
  const size = 512;
  const half = size / 2;
  const [c, g] = canvas(size, size);
  const rand = rng(7 + style.length * 13);
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const x0 = i * half;
      const y0 = j * half;
      g.fillStyle = (i + j) % 2 ? cfg.a : cfg.b;
      g.fillRect(x0, y0, half, half);
      if (cfg.vein) {
        for (let v = 0; v < 9; v++) {
          g.strokeStyle = `rgba(${cfg.vein[0] + rand() * 40},${cfg.vein[1] + rand() * 40},${cfg.vein[2]},${0.03 + rand() * 0.07})`;
          g.lineWidth = 0.6 + rand() * 1.6;
          g.beginPath();
          let x = x0 + rand() * half;
          let y = y0 + rand() * half;
          g.moveTo(x, y);
          for (let s = 0; s < 5; s++) {
            x += (rand() - 0.5) * 90;
            y += (rand() - 0.5) * 90;
            g.lineTo(Math.max(x0, Math.min(x0 + half, x)), Math.max(y0, Math.min(y0 + half, y)));
          }
          g.stroke();
        }
      }
      if (cfg.motif) {
        // diamond medallion with a ring, classic casino carpet
        const cx = x0 + half / 2;
        const cy = y0 + half / 2;
        g.strokeStyle = cfg.motif;
        g.globalAlpha = 0.55;
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(cx, cy - 86);
        g.lineTo(cx + 86, cy);
        g.lineTo(cx, cy + 86);
        g.lineTo(cx - 86, cy);
        g.closePath();
        g.stroke();
        g.strokeStyle = cfg.motif2;
        g.lineWidth = 4;
        g.beginPath();
        g.arc(cx, cy, 34, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = cfg.motif;
        g.beginPath();
        g.arc(cx, cy, 9, 0, Math.PI * 2);
        g.fill();
        for (const [px, py] of [[x0, y0], [x0 + half, y0], [x0, y0 + half], [x0 + half, y0 + half]]) {
          g.beginPath();
          g.arc(px, py, 14, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      }
      if (cfg.gravel) {
        for (let n = 0; n < 900; n++) {
          const v = 40 + rand() * 60;
          g.fillStyle = `rgba(${v},${v},${v + 12},${0.25 + rand() * 0.4})`;
          g.fillRect(x0 + rand() * half, y0 + rand() * half, 1.5 + rand() * 2.5, 1.5 + rand() * 2.5);
        }
      }
      if (cfg.hazard) {
        g.strokeStyle = cfg.hazard;
        g.globalAlpha = 0.35;
        g.lineWidth = 3;
        g.strokeRect(x0 + 22, y0 + 22, half - 44, half - 44);
        g.globalAlpha = 1;
        for (let n = 0; n < 60; n++) {
          g.fillStyle = `rgba(255,255,255,${rand() * 0.07})`;
          g.fillRect(x0 + rand() * half, y0 + rand() * half, 20 + rand() * 40, 1);
        }
      }
      if (cfg.rivets) {
        g.fillStyle = 'rgba(140,160,210,0.45)';
        for (const [px, py] of [[18, 18], [half - 18, 18], [18, half - 18], [half - 18, half - 18]]) {
          g.beginPath();
          g.arc(x0 + px, y0 + py, 5, 0, Math.PI * 2);
          g.fill();
        }
        g.strokeStyle = 'rgba(120,150,255,0.14)';
        g.lineWidth = 2;
        for (let n = 1; n < 5; n++) {
          g.beginPath();
          g.moveTo(x0 + 36, y0 + (n * half) / 5);
          g.lineTo(x0 + half - 36, y0 + (n * half) / 5);
          g.stroke();
        }
      }
    }
  }
  g.strokeStyle = cfg.seam;
  g.lineWidth = 3;
  for (let k = 0; k <= 2; k++) {
    g.beginPath();
    g.moveTo(k * half, 0);
    g.lineTo(k * half, size);
    g.moveTo(0, k * half);
    g.lineTo(size, k * half);
    g.stroke();
  }
  floorCache[style] = finish(c);
  return floorCache[style];
}

const PALETTES = [
  ['#0b1d3a', '#00e5ff', '#ff2d6b', '#f5d76e'],
  ['#1b0b3a', '#b14dff', '#00e5ff', '#ffffff'],
  ['#2a0a16', '#ff3355', '#ffb347', '#b14dff'],
  ['#06262b', '#3dffb0', '#00b3ff', '#f5d76e'],
];

let paintings = null;
export function getPaintingTextures() {
  if (paintings) return paintings;
  paintings = PALETTES.map((pal, idx) => {
    const [c, g] = canvas(128, 96);
    const rand = rng(31 + idx * 17);
    const grad = g.createLinearGradient(0, 0, 128, 96);
    grad.addColorStop(0, pal[0]);
    grad.addColorStop(1, '#05060f');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 96);
    for (let s = 0; s < 7; s++) {
      g.fillStyle = pal[1 + Math.floor(rand() * 3)];
      g.globalAlpha = 0.35 + rand() * 0.5;
      const x = rand() * 128;
      const y = rand() * 96;
      const r = 6 + rand() * 26;
      g.beginPath();
      if (rand() > 0.5) g.arc(x, y, r, 0, Math.PI * 2);
      else {
        g.moveTo(x, y - r);
        g.lineTo(x + r, y + r);
        g.lineTo(x - r, y + r);
        g.closePath();
      }
      g.fill();
    }
    g.globalAlpha = 1;
    return finish(c, false);
  });
  return paintings;
}

// Wall of safe-deposit boxes for the bank.
let lockers = null;
export function getLockerTexture() {
  if (lockers) return lockers;
  const [c, g] = canvas(256, 192);
  g.fillStyle = '#56645f';
  g.fillRect(0, 0, 256, 192);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 6; x++) {
      const px = 6 + x * 41.5;
      const py = 6 + y * 46;
      const grad = g.createLinearGradient(px, py, px, py + 40);
      grad.addColorStop(0, '#9aa8a2');
      grad.addColorStop(1, '#6d7b76');
      g.fillStyle = grad;
      g.fillRect(px, py, 36, 40);
      g.strokeStyle = '#2a332f';
      g.lineWidth = 2;
      g.strokeRect(px, py, 36, 40);
      g.fillStyle = '#e8c14a';
      g.beginPath();
      g.arc(px + 18, py + 24, 5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#2a332f';
      g.fillRect(px + 10, py + 7, 16, 5);
    }
  }
  lockers = finish(c, false);
  return lockers;
}

// Lit office windows for the rooftop skyline.
let windowsTex = null;
export function getWindowTexture() {
  if (windowsTex) return windowsTex;
  const [c, g] = canvas(64, 128);
  const rand = rng(404);
  g.fillStyle = '#0a0f1e';
  g.fillRect(0, 0, 64, 128);
  const lit = ['#ffd98a', '#ffe9b8', '#8ad0ff', '#ffb86b'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 6; x++) {
      const r = rand();
      g.fillStyle = r > 0.62 ? lit[Math.floor(rand() * lit.length)] : '#141b30';
      g.globalAlpha = r > 0.62 ? 0.55 + rand() * 0.45 : 1;
      g.fillRect(4 + x * 10, 3 + y * 8, 6, 5);
    }
  }
  g.globalAlpha = 1;
  windowsTex = finish(c);
  windowsTex.magFilter = THREE.NearestFilter;
  return windowsTex;
}

let glowTex = null;
export function getGlowTexture() {
  if (glowTex) return glowTex;
  const [c, g] = canvas(64, 64);
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}
