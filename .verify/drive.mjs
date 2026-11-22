// Dev-only smoke test: drives the game in headless Chrome over the DevTools protocol.
// usage: node .verify/drive.mjs <chrome.exe> <url> <screenshot dir>
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [, , chromePath, url, outDir] = process.argv;
const PORT = 9334;
const profile = mkdtempSync(join(tmpdir(), 'thief-verify-'));
const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1280,720',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--no-first-run',
    '--disable-component-update',
    '--disable-background-networking',
    '--mute-audio',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const problems = [];
let send;

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
      const d = msg.params.exceptionDetails;
      problems.push('EXCEPTION: ' + (d.exception?.description || d.text).slice(0, 400));
    } else if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
      const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
      if (!/THREE\.Clock|PCFSoftShadowMap|GPU stall|ReadPixels/.test(text)) {
        problems.push(msg.params.type.toUpperCase() + ': ' + text.slice(0, 300));
      }
    }
  };
  send = (method, params = {}) =>
    new Promise((res) => {
      pending.set(++id, res);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) =>
    (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
    if (r?.data) writeFileSync(join(outDir, name + '.jpg'), Buffer.from(r.data, 'base64'));
  };
  const key = async (code, keyName, vk, hold = 0) => {
    const p = { code, key: keyName, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk };
    await send('Input.dispatchKeyEvent', { type: 'keyDown', ...p });
    if (hold) await sleep(hold);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...p });
  };
  const click = (sel) => evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`);
  const waitFor = async (expr, ms = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await evaluate(expr)) return true;
      await sleep(200);
    }
    return false;
  };
  const text = (sel) => evaluate(`document.querySelector(${JSON.stringify(sel)})?.textContent || ''`);

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url });
  await sleep(3500);
  await shot('01-title');
  console.log('title buttons:', await evaluate(`[...document.querySelectorAll('.title-actions button')].map(b => b.textContent.trim()).join(' | ')`));

  // ---- world select + preview baking
  await click('.btn-play');
  const baked = await waitFor(`document.querySelectorAll('.world-thumb img').length === 6`, 40000);
  console.log('previews baked:', baked, '| cards:', await evaluate(`document.querySelectorAll('.world-card').length`), '| locked:', await evaluate(`document.querySelectorAll('.world-card.locked').length`));
  await sleep(900);
  await shot('02-worlds');

  const worlds = await evaluate(`[...document.querySelectorAll('.world-card h3')].map(h => h.textContent)`);
  for (let w = 0; w < worlds.length; w++) {
    const tag = `${String(w + 3).padStart(2, '0')}-${worlds[w].toLowerCase().replace(/\s+/g, '-')}`;
    const ok = await click(`.world-card:nth-child(${w + 1}) .btn-primary`);
    await waitFor(`!!document.querySelector('.level-card')`);
    await sleep(700);
    const levels = await evaluate(`document.querySelectorAll('.level-card').length`);
    if (w === 1) await shot(tag + '-a-levels');
    await click('.level-card');
    await waitFor(`!!document.querySelector('.btn-start')`);
    await sleep(1200);
    if (w < 2 || w === 3) await shot(tag + '-b-briefing');
    await click('.btn-start');
    await waitFor(`!document.querySelector('.intro-screen') && !!document.querySelector('.hud')`, 8000);
    await sleep(500);
    await shot(tag + '-c-play');
    const objectives = await evaluate(`[...document.querySelectorAll('.objective')].map(e => e.textContent).join(' / ')`);
    // exercise movement for a moment, then report state
    await key('KeyW', 'w', 87, 500);
    console.log(
      `${worlds[w].padEnd(18)} open:${ok} levels:${levels} timer:${await text('.timer-value')} | ${objectives}`,
    );
    if (w === 0) {
      // camera modes
      for (const mode of ['cinematic', 'wide', 'first']) {
        await key('KeyC', 'c', 67);
        await sleep(1300);
        await shot(`03-camera-${mode}`);
      }
      console.log('camera label after 3 switches:', await text('.btn-cam span'));
      await key('KeyC', 'c', 67);
    }
    // leave through the pause menu -> level select -> worlds
    // pause (retrying if a life was lost meanwhile and the level restarted)
    for (let i = 0; i < 30 && !(await evaluate(`!!document.querySelector('.panel')`)); i++) {
      await key('Escape', 'Escape', 27);
      await sleep(400);
    }
    if (w === 0) await shot('03-pause');
    const left = await evaluate(`(() => { const b = [...document.querySelectorAll('.panel button')].find(b => /LEVEL SELECT/.test(b.textContent)); if (!b) return false; b.click(); return true; })()`);
    await waitFor(`!!document.querySelector('.level-card')`);
    await click('.btn-back');
    const back = await waitFor(`!!document.querySelector('.world-card')`);
    if (!left || !back) problems.push(`NAV: could not return to world select from ${worlds[w]}`);
    await sleep(400);
  }
  await send('Browser.close');
  ws.close();
}

main()
  .catch((e) => problems.push('DRIVER: ' + e.message))
  .finally(async () => {
    console.log(problems.length ? 'PROBLEMS:\n' + [...new Set(problems)].join('\n') : 'NO CONSOLE ERRORS');
    await sleep(800);
    try {
      chrome.kill();
    } catch {
      /* already closed */
    }
    process.exit(0);
  });
