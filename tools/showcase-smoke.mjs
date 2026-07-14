// Showcase-branch guard: boots the recording harness in each documented state
// and asserts the on-camera surfaces render, so a rehearsal never opens onto a
// broken frame. Recording-branch only (codex/demo-launch-showcase); never part
// of the Devvit production build. Run: node tools/showcase-smoke.mjs
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const VITE_BIN = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const CHROME = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  '/usr/bin/google-chrome',
].filter(Boolean).find((p) => existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIME_SCALE = Math.max(1, Number(process.env.SMOKE_TIME_SCALE ?? (process.env.CI ? 4 : 1)) || 1);
const assert = (c, m) => { if (!c) throw new Error(m); };

function startVite(port, env) {
  const child = spawn(
    process.execPath,
    [VITE_BIN, '--config', 'vite.dev3d.config.mjs', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: ROOT, env: { ...process.env, MOCK_API: '1', ...env }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
  );
  let out = '';
  child.stdout.on('data', (c) => { out += c; });
  child.stderr.on('data', (c) => { out += c; });
  return { output: () => out, stop: () => { if (!child.killed) child.kill(); } };
}

async function openPage(url) {
  if (!CHROME) throw new Error('Chrome/Edge not found. Set CHROME_PATH.');
  const userDir = await mkdtemp(join(tmpdir(), 'omd-sc-'));
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${userDir}`, url], { stdio: 'ignore', windowsHide: true });
  const portFile = join(userDir, 'DevToolsActivePort');
  let dbg = '';
  for (let i = 0; i < 80 * TIME_SCALE; i++) { if (existsSync(portFile)) { dbg = (await readFile(portFile, 'utf8')).split(/\r?\n/)[0]; if (dbg) break; } await sleep(125); }
  let target;
  for (let i = 0; i < 80 * TIME_SCALE; i++) { const l = await fetch(`http://127.0.0.1:${dbg}/json/list`).then((r) => r.json()); target = l.find((t) => t.type === 'page' && t.url.startsWith(url)); if (target?.webSocketDebuggerUrl) break; await sleep(125); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let nextId = 1; const pending = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
  const call = (method, params = {}) => new Promise((res) => { const id = nextId++; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
  const ev = async (expr) => { const r = await call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r?.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval failed'); return r?.result?.value; };
  const waitFor = async (expr, label, ms = 20000) => { const t = Date.now(); const dl = ms * TIME_SCALE; let last = null; while (Date.now() - t < dl) { try { if (await ev(expr)) return; last = null; } catch (e) { last = e; } await sleep(250); } throw new Error(`timeout: ${label}${last ? ` (${last.message})` : ''}`); };
  await call('Runtime.enable');
  return { ev, waitFor, close: async () => { ws.close(); if (!proc.killed) proc.kill(); for (let i = 0; i < 8; i++) { try { await rm(userDir, { recursive: true, force: true }); break; } catch { await sleep(150); } } } };
}

async function withServer(name, port, env, run) {
  const server = startVite(port, env);
  try {
    for (let i = 0; i < 120 * TIME_SCALE; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) break; } catch {} await sleep(250); }
    await run(`http://127.0.0.1:${port}/`);
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(server.output());
    throw err;
  } finally {
    server.stop();
  }
}

const dismissCoach = async (p) => {
  for (let i = 0; i < 14 && (await p.ev(`!!document.querySelector('.coach')`)); i++) {
    await p.ev(`document.querySelector('.coach .co-next')?.click()`);
    await sleep(120);
  }
};

async function showcaseRich(url) {
  const p = await openPage(url);
  try {
    await p.waitFor(`!!document.querySelector('canvas') && document.body.innerText.includes('VAELMAR')`, 'showcase city boot');
    await p.waitFor(`!document.querySelector('.loader:not(.done)')`, 'loader exit');
    await dismissCoach(p);
    // The dashboard is open on the desktop recording viewport; open SHOP. Its
    // HOUSE sub-view is default (cosmetics); EXPAND holds the land fund.
    await p.ev(`[...document.querySelectorAll('.dash-tab')].find((b)=>b.textContent.trim()==='SHOP')?.click()`);
    await p.waitFor(`(document.querySelector('.ch-coins')?.textContent||'').includes('12 COINS')`, 'SHOP shows the 12-Coin showcase balance');
    await p.waitFor(`[...document.querySelectorAll('.shop-row')].some((r)=>r.textContent.includes('Hearth Lantern') && r.textContent.includes('3'))`, 'Hearth Lantern is buyable on camera (3 Coins)');
    await p.waitFor(`[...document.querySelectorAll('.shop-row')].some((r)=>r.textContent.includes('Slate Roof') && r.textContent.includes('EQUIPPED'))`, 'the decorated house shows an equipped cosmetic');
    // Switch to the EXPAND sub-view for the connected-land fund.
    await p.ev(`[...document.querySelectorAll('.shop-seg button')].find((b)=>b.textContent.trim()==='EXPAND')?.click()`);
    await p.waitFor(`document.body.innerText.includes('VILLAGE LAND FUND')`, 'the EXPAND view shows the shared land fund');
    await p.waitFor(`[...document.querySelectorAll('.land-row')].some((r)=>r.textContent.includes('Outer Fields') && r.textContent.includes('OPEN'))`, 'the city boots already expanded (Outer Fields OPEN)');
    await p.waitFor(`[...document.querySelectorAll('.land-row')].some((r)=>r.textContent.includes('River Ward') && r.textContent.includes('FUNDING') && /255\\/260/.test(r.textContent))`, 'River Ward sits one pledge from unlocking');
    await p.waitFor(`(document.querySelector('.land-pledge')?.textContent||'').includes('PLEDGE')`, 'the pledge control is ready to fund on camera');
  } finally { await p.close(); }
}

async function showcaseRaid(url) {
  const p = await openPage(url);
  try {
    await p.waitFor(`!!document.querySelector('canvas') && document.body.innerText.includes('VAELMAR')`, 'raid showcase city boot');
    await p.waitFor(`!document.querySelector('.loader:not(.done)')`, 'loader exit');
    await dismissCoach(p);
    await p.ev(`[...document.querySelectorAll('.dash-tab')].find((b)=>b.textContent.trim()==='LIVE')?.click()`);
    await p.waitFor(`document.body.innerText.includes('RAID AT NEXT DAWN')`, 'the Red Signal is armed for the raid-warning shot');
    await p.waitFor(`!!document.querySelector('.raid.soon') && (document.querySelector('.raid-detail')?.textContent||'').includes('Red Signal')`, 'RAID WATCH shows the armed Red Signal detail');
  } finally { await p.close(); }
}

await withServer('showcase rich state (city, shop, land, world)', 4691, { MOCK_SHOWCASE: '1' }, showcaseRich);
await withServer('showcase raid-warning state', 4692, { MOCK_SHOWCASE: '1', MOCK_SHOWCASE_RAID: '1' }, showcaseRaid);
console.log('showcase smoke passed');
