import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const port = process.env.DEMO_PORT ?? '4670';

const child = spawn(
  process.execPath,
  [vite, '--config', 'vite.dev3d.config.mjs', '--host', '127.0.0.1', '--port', port, '--strictPort'],
  {
    cwd: root,
    env: { ...process.env, MOCK_API: '1' },
    stdio: 'inherit',
  },
);

console.log(`\nRecording showcase: http://127.0.0.1:${port}/?showcase=1\n`);

child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
