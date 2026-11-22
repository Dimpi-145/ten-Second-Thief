// Procedural ambient background loops, one per world (Web Audio, no asset files).
import { getState } from './store.js';

// drone: [frequency, type, gain] oscillators   noise: [filter type, frequency, Q, gain, LFO rate]
// blip: occasional notes [interval seconds, frequencies, type, gain]
const RECIPES = {
  menu: { drone: [[55, 'sine', 0.5], [82.5, 'sine', 0.25]], noise: ['lowpass', 300, 1, 0.12, 0.08] },
  museum: {
    drone: [[65.4, 'sine', 0.5], [98, 'sine', 0.3], [130.8, 'triangle', 0.08]],
    noise: ['lowpass', 380, 1, 0.14, 0.07],
    blip: [3.2, [523, 659, 784], 'sine', 0.05],
  },
  bank: {
    drone: [[49, 'sine', 0.55], [73.4, 'triangle', 0.2]],
    noise: ['lowpass', 240, 1, 0.16, 0.05],
    blip: [1, [1400], 'square', 0.012], // wall-clock tick
  },
  casino: {
    drone: [[110, 'triangle', 0.2], [164.8, 'sine', 0.16]],
    noise: ['bandpass', 1800, 0.8, 0.07, 0.3],
    blip: [0.42, [659, 784, 988, 1175, 1319, 988], 'triangle', 0.045],
  },
  rooftop: {
    drone: [[58.3, 'sine', 0.35]],
    noise: ['bandpass', 520, 0.7, 0.5, 0.11], // wind
    blip: [4.5, [330, 392], 'sine', 0.03],
  },
  lab: {
    drone: [[50, 'sawtooth', 0.07], [100, 'sine', 0.3], [150, 'sine', 0.1]], // mains hum
    noise: ['highpass', 5200, 1, 0.035, 0.6],
    blip: [1.7, [1760, 2093, 1568], 'sine', 0.03],
  },
  space: {
    drone: [[41.2, 'sine', 0.6], [61.7, 'sine', 0.35], [123.5, 'sine', 0.1]],
    noise: ['lowpass', 180, 2, 0.2, 0.04],
    blip: [5.5, [880, 1318, 660], 'sine', 0.035],
  },
};

let ctx = null;
let current = null; // { id, master, stops: [] }
let volume = 0.16;

function audio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function stopCurrent() {
  if (!current || !ctx) return;
  const old = current;
  current = null;
  old.master.gain.cancelScheduledValues(ctx.currentTime);
  old.master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
  clearInterval(old.timer);
  setTimeout(() => {
    old.nodes.forEach((n) => {
      try {
        n.stop();
      } catch {
        /* already stopped */
      }
    });
    old.master.disconnect();
  }, 1200);
}

export const ambient = {
  // Cross-fades to the loop for `id` (a world id or "menu").
  play(id) {
    if (current && current.id === id) return;
    stopCurrent();
    const recipe = RECIPES[id];
    if (!recipe || getState().muted) return;
    const a = audio();
    if (!a) return;

    const master = a.createGain();
    master.gain.value = 0;
    master.gain.setTargetAtTime(volume, a.currentTime, 0.8);
    master.connect(a.destination);
    const nodes = [];

    for (const [freq, type, gain] of recipe.drone) {
      const osc = a.createOscillator();
      const g = a.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 12;
      g.gain.value = gain;
      osc.connect(g).connect(master);
      osc.start();
      nodes.push(osc);
    }

    if (recipe.noise) {
      const [ftype, freq, q, gain, rate] = recipe.noise;
      const len = a.sampleRate * 2;
      const buf = a.createBuffer(1, len, a.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = a.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = a.createBiquadFilter();
      filter.type = ftype;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const g = a.createGain();
      g.gain.value = gain;
      // slow LFO breathes the noise level (wind gusts, air-con, static)
      const lfo = a.createOscillator();
      const depth = a.createGain();
      lfo.frequency.value = rate;
      depth.gain.value = gain * 0.6;
      lfo.connect(depth).connect(g.gain);
      src.connect(filter).connect(g).connect(master);
      src.start();
      lfo.start();
      nodes.push(src, lfo);
    }

    let timer = 0;
    if (recipe.blip) {
      const [every, notes, type, gain] = recipe.blip;
      let n = 0;
      timer = setInterval(() => {
        if (!current || current.master !== master || a.state !== 'running') return;
        const t0 = a.currentTime;
        const osc = a.createOscillator();
        const g = a.createGain();
        osc.type = type;
        osc.frequency.value = notes[n++ % notes.length];
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.min(0.5, every * 0.8));
        osc.connect(g).connect(master);
        osc.start(t0);
        osc.stop(t0 + 0.6);
      }, every * 1000);
    }

    current = { id, master, nodes, timer };
  },
  stop() {
    stopCurrent();
  },
  // Ducks the loop while paused / on result screens.
  duck(on) {
    volume = on ? 0.06 : 0.16;
    if (current && ctx) current.master.gain.setTargetAtTime(volume, ctx.currentTime, 0.3);
  },
};
