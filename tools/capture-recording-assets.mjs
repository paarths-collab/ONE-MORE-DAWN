import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const VITE_BIN = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const OUT = join(ROOT, 'recording-assets', 'screenshots');
const PORT = Number(process.env.CAPTURE_PORT ?? 4671);
const NODE_BIN = existsSync(process.execPath) ? process.execPath : 'node';
const CHROME = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find((path) => path && existsSync(path));

if (!CHROME) throw new Error('Chrome or Edge was not found. Set CHROME_PATH and retry.');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const removeProfile = async (path) => {
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      await rm(path, { recursive: true, force: true });
      return;
    } catch {
      await sleep(150);
    }
  }
};

const waitForExit = (child) => new Promise((resolve) => {
  if (child.exitCode !== null || child.signalCode !== null) {
    resolve();
    return;
  }
  const timer = setTimeout(resolve, 2_000);
  child.once('exit', () => {
    clearTimeout(timer);
    resolve();
  });
});

class CdpPage {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  call(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 15_000);
    });
  }

  async eval(expression) {
    const result = await this.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'Page evaluation failed.');
    return result.result.value;
  }

  async waitFor(expression, label) {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      if (await this.eval(expression)) return;
      await sleep(150);
    }
    throw new Error(`Timed out waiting for ${label}.`);
  }

  async screenshot() {
    const result = await this.call('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true });
    return Buffer.from(result.data, 'base64');
  }

  close() {
    this.ws.close();
  }
}

const waitForHttp = async (url) => {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // The development server is still starting.
    }
    await sleep(150);
  }
  throw new Error(`Vite did not start at ${url}.`);
};

const startVite = () => spawn(
  NODE_BIN,
  [VITE_BIN, '--config', 'vite.dev3d.config.mjs', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, env: { ...process.env, MOCK_API: '1' }, stdio: 'ignore', windowsHide: true },
);

const openPage = async (url) => {
  // A unique profile avoids local storage and previous capture state leaking in.
  const profile = await mkdtemp(join(tmpdir(), 'omd-capture-'));
  const browser = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--disable-background-networking',
    '--remote-debugging-port=0', '--window-size=1920,1080', `--user-data-dir=${profile}`, url,
  ], { stdio: 'ignore', windowsHide: true });
  const portFile = join(profile, 'DevToolsActivePort');
  try {
    let port = '';
    for (let attempt = 0; attempt < 100; attempt++) {
      if (existsSync(portFile)) {
        port = (await readFile(portFile, 'utf8')).split(/\r?\n/)[0] ?? '';
        if (port) break;
      }
      await sleep(100);
    }
    if (!port) throw new Error('Chrome did not expose a DevTools port.');
    let target;
    for (let attempt = 0; attempt < 100; attempt++) {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      target = targets.find((entry) => entry.type === 'page' && entry.url.startsWith(url));
      if (target?.webSocketDebuggerUrl) break;
      await sleep(100);
    }
    if (!target?.webSocketDebuggerUrl) throw new Error('Chrome page target was not found.');
    const cdp = new CdpPage(new WebSocket(target.webSocketDebuggerUrl));
    await new Promise((resolve) => cdp.ws.addEventListener('open', resolve, { once: true }));
    await cdp.call('Runtime.enable');
    await cdp.call('Page.enable');
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    return {
      cdp,
      close: async () => {
        cdp.close();
        if (!browser.killed) browser.kill();
        await waitForExit(browser);
        await removeProfile(profile);
      },
    };
  } catch (error) {
    if (!browser.killed) browser.kill();
    await waitForExit(browser);
    await removeProfile(profile);
    throw error;
  }
};

const SHOTS = [
  ['01_empty_camp_clean.png', 'camp', 700],
  ['02_early_settlement_clean.png', 'contribute', 1700],
  ['03_growing_city_clean.png', 'growth', 2200],
  ['04_developed_city_dome_clean.png', 'warning', 2800],
  ['05_raid_before_intact_dome.png', 'warning', 500],
  ['06_raid_aftermath_damaged_city.png', 'raid', 8200],
  ['07_destroyed_homes_clean.png', 'rebuild', 500],
  ['08_rebuilt_city_sunrise_clean.png', 'dawn', 650],
];

await mkdir(OUT, { recursive: true });
const server = startVite();
try {
  const base = `http://127.0.0.1:${PORT}/`;
  await waitForHttp(base);
  for (const [file, scene, settleMs] of SHOTS) {
    const url = `${base}?showcase=1&clean=1&scene=${scene}`;
    const { cdp, close } = await openPage(url);
    try {
      await cdp.waitFor(`document.querySelector('.demo-director')?.dataset.showcaseScene === ${JSON.stringify(scene)} && !!document.querySelector('canvas')`, `${scene} scene`);
      await cdp.waitFor(`!document.querySelector('.loader:not(.done)')`, `${scene} loader`);
      await sleep(settleMs);
      const hudVisible = await cdp.eval(`(() => [...document.querySelectorAll('.hud')].some((node) => getComputedStyle(node).opacity !== '0'))()`);
      if (hudVisible) throw new Error(`${scene} capture still exposes HUD.`);
      const captionVisible = await cdp.eval(`(() => [...document.querySelectorAll('.epic-banner, .floats')].some((node) => getComputedStyle(node).opacity !== '0'))()`);
      if (captionVisible) throw new Error(`${scene} capture still exposes a caption.`);
      await writeFile(join(OUT, file), await cdp.screenshot());
      console.log(`captured ${file}`);
    } finally {
      await close();
    }
  }
} finally {
  if (!server.killed) server.kill();
}
