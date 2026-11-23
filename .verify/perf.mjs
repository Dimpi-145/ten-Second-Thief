// Dev-only performance probe: plays the last level of every world in headless Chrome (real GPU,
// uncapped frame rate) and reports frame times, draw calls and memory.
// usage: node .verify/perf.mjs <chrome.exe> <dev server url> [screen scale] [forced render dpr]
//   screen scale     emulate a 1920x1080 display at this device pixel ratio (e.g. 1.5)
//   forced render dpr  override the game's own resolution choice, to compare against it
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [, , chromePath, url, scale, forceDpr] = process.argv;
const PORT = 9335;
const profile = mkdtempSync(join(tmpdir(), 'thief-perf-'));
const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1600,900',
    '--enable-gpu',
    '--ignore-gpu-blocklist',
    '--use-angle=d3d11',
    '--disable-gpu-vsync',
    '--disable-frame-rate-limit',
    '--enable-precise-memory-info',
    '--no-first-run',
    '--disable-component-update',
    '--disable-background-networking',
    '--mute-audio',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SAMPLE = `new Promise((res) => {
  const gl = window.__r3f.gl;
  const t0 = performance.now();
  let last = t0, n = 0, calls = 0, tris = 0, resizes = 0, pr = gl.getPixelRatio();
  const dts = [];
  function f() {
    const now = performance.now();
    dts.push(now - last); last = now; n++;
    if (gl.getPixelRatio() !== pr) { pr = gl.getPixelRatio(); resizes++; }
    calls = Math.max(calls, gl.info.render.calls);
    tris = Math.max(tris, gl.info.render.triangles);
    if (now - t0 < 4000) requestAnimationFrame(f);
    else {
      dts.sort((a, b) => a - b);
      res({
        fps: Math.round((n / (now - t0)) * 1000),
        p50: +dts[Math.floor(n * 0.5)].toFixed(1),
        p99: +dts[Math.floor(n * 0.99)].toFixed(1),
        max: +dts[n - 1].toFixed(1),
        calls, tris,
        programs: gl.info.programs.length,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        lights: (() => { let c = 0; window.__r3f.scene.traverseVisible((o) => { if (o.isPointLight) c++; }); return c; })(),
        heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : 0,
        dpr: +gl.getPixelRatio().toFixed(2), resizes,
      });
    }
  }
  requestAnimationFrame(f);
})`;

async function main() {
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      target = list.find((t) => t.type === 'page');
    } catch {
      /* not up yet */
    }
  }
  if (!target) throw new Error('browser did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result ?? msg.error);
      pending.delete(msg.id);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.log('EXCEPTION:', (msg.params.exceptionDetails.exception?.description || '').slice(0, 300));
    }
  };
  const send = (method, params = {}) =>
    new Promise((res) => {
      pending.set(++id, res);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) =>
    (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;
  const click = (sel) =>
    evaluate(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel)})].pop(); if (!e) return false; e.click(); return true; })()`);
  const waitFor = async (expr, ms = 20000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await evaluate(expr)) return true;
      await sleep(150);
    }
    return false;
  };
  const key = async (code, keyName, vk) => {
    const p = { code, key: keyName, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk };
    await send('Input.dispatchKeyEvent', { type: 'keyDown', ...p });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...p });
  };

  await send('Runtime.enable');
  await send('Page.enable');
  if (scale) {
    await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: +scale, mobile: false });
  }
  await send('Page.navigate', { url: url + (url.includes('?') ? '&' : '?') + 'unlock' });
  await waitFor(`!!window.__r3f && !!document.querySelector('.btn-play')`);
  await sleep(1500);
  console.log(
    'GPU:',
    await evaluate(`(() => { const g = window.__r3f.gl.getContext(); const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()`),
  );
  console.log('title            ', JSON.stringify(await evaluate(SAMPLE)));

  await click('.btn-play');
  await waitFor(`document.querySelectorAll('.world-thumb img').length === 6`, 40000);
  await sleep(600);
  console.log('world select     ', JSON.stringify(await evaluate(SAMPLE)));

  const worlds = await evaluate(`[...document.querySelectorAll('.world-card h3')].map(h => h.textContent)`);
  for (let w = 0; w < worlds.length; w++) {
    await evaluate(`(() => { document.querySelector('.world-card:nth-child(${w + 1}) .btn-primary').click(); })()`);
    await waitFor(`!!document.querySelector('.level-card')`);
    await sleep(300);
    await click('.level-card'); // last (largest) level
    await waitFor(`!!document.querySelector('.btn-start')`);
    await click('.btn-start');
    await waitFor(`!document.querySelector('.intro-screen') && !!document.querySelector('.hud')`, 8000);
    if (forceDpr) await evaluate(`window.__r3f.setDpr(${+forceDpr})`);
    console.log(worlds[w].padEnd(17), JSON.stringify(await evaluate(SAMPLE)));
    for (let i = 0; i < 40 && !(await evaluate(`!!document.querySelector('.panel')`)); i++) {
      await key('Escape', 'Escape', 27);
      await sleep(300);
    }
    await evaluate(`(() => { const b = [...document.querySelectorAll('.panel button')].find(b => /LEVEL SELECT/.test(b.textContent)); b && b.click(); })()`);
    await waitFor(`!!document.querySelector('.level-card')`);
    await evaluate(`document.querySelector('.btn-back').click()`);
    await waitFor(`!!document.querySelector('.world-card')`);
    await sleep(300);
  }
  await send('Browser.close');
  ws.close();
}

main()
  .catch((e) => console.log('DRIVER:', e.message))
  .finally(async () => {
    await sleep(500);
    try {
      chrome.kill();
    } catch {
      /* already closed */
    }
    process.exit(0);
  });
