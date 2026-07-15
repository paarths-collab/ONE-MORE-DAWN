import { defineConfig } from 'vite';
import { copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ===========================================================================
// FRONTEND-ONLY DEMO BUILD  (npm run build:demo)
// ===========================================================================
// Produces a self-contained static site of the One More Dawn client in
// dist-demo/ — no Devvit runtime, no server. `define: __DEMO__` switches on the
// in-browser mock backend (src/client/frontendMock.ts) and the "visual demo"
// banner (see game.tsx), so the client boots into its full LIVE experience for
// judges to click through. `base: './'` + the client's already-relative asset
// paths make it deployable at any URL (Vercel / Netlify root, GitHub Pages
// subpath, or a plain file host) with no per-host config.
//
// This is separate from vite.config.ts (the real Devvit build) and
// vite.dev3d.config.mjs (the local QA dev server); neither is affected.
// ===========================================================================

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'dist-demo');

// A static host serves "/" from index.html; the app's entry is game.html, so
// copy it to index.html after the bundle is written. Relative asset paths mean
// the copy resolves everything from the same directory.
const indexAlias = () => ({
  name: 'demo-index-alias',
  async closeBundle() {
    await copyFile(join(OUT, 'game.html'), join(OUT, 'index.html'));
  },
});

export default defineConfig({
  root: join(HERE, 'src/client'),
  base: './',
  publicDir: join(HERE, 'public'), // GLBs, sfx, music, splash art (served under assets/)
  define: { __DEMO__: 'true' },
  esbuild: { jsx: 'automatic' },
  plugins: [indexAlias()],
  build: {
    outDir: OUT,
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    sourcemap: false,
    rollupOptions: { input: join(HERE, 'src/client/game.html') },
  },
});
