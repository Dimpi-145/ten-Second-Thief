// Tiny synthesised sound effects (Web Audio) - no asset files needed.
import { getState } from './store.js';

let ctx = null;

function ac() {
  if (getState().muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, dur, { type = 'sine', vol = 0.12, slide = 0, delay = 0 } = {}) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function noise(dur, vol = 0.15) {
  const a = ac();
  if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  const gain = a.createGain();
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  gain.gain.value = vol;
  src.buffer = buf;
  src.connect(filter).connect(gain).connect(a.destination);
  src.start();
}

export const sfx = {
  click: () => tone(520, 0.08, { type: 'triangle', vol: 0.08 }),
  gold: () => {
    tone(880, 0.1, { type: 'triangle' });
    tone(1320, 0.14, { type: 'triangle', delay: 0.06 });
  },
  diamond: () => {
    tone(1175, 0.1, { type: 'sine' });
    tone(1568, 0.1, { type: 'sine', delay: 0.06 });
    tone(2093, 0.2, { type: 'sine', delay: 0.12 });
  },
  key: () => {
    tone(660, 0.12, { type: 'square', vol: 0.06 });
    tone(990, 0.12, { type: 'square', vol: 0.06, delay: 0.1 });
    tone(1320, 0.25, { type: 'square', vol: 0.06, delay: 0.2 });
  },
  jump: () => tone(260, 0.28, { type: "triangle", vol: 0.1, slide: 520 }),
  locked: () => tone(160, 0.18, { type: 'square', vol: 0.07 }),
  smoke: () => noise(0.6, 0.2),
  spotted: () => tone(700, 0.2, { type: 'sawtooth', vol: 0.07, slide: 500 }),
  alarm: () => {
    for (let i = 0; i < 4; i++) tone(i % 2 ? 620 : 880, 0.16, { type: 'square', vol: 0.06, delay: i * 0.17 });
  },
  dead: () => {
    tone(300, 0.5, { type: 'sawtooth', vol: 0.12, slide: -240 });
    noise(0.3, 0.12);
  },
  tick: () => tone(1000, 0.07, { type: 'square', vol: 0.07 }),
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', delay: i * 0.1 }));
  },
  gameover: () => {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, { type: 'sawtooth', vol: 0.08, delay: i * 0.18 }));
  },
};
