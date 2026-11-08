import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const children = new Set();
const stop = () => { for (const child of children) child.kill('SIGTERM'); };
process.on('SIGINT', () => { stop(); process.exit(0); });
process.on('SIGTERM', () => { stop(); process.exit(0); });
const launch = (args, cwd) => {
  const child = spawn('npm', args, { cwd, stdio: 'inherit' });
  children.add(child);
  child.on('exit', () => children.delete(child));
  return child;
};
const healthy = async () => {
  try { const response = await fetch('http://127.0.0.1:5184/api/health', { signal: AbortSignal.timeout(1500) }); const health = await response.json(); return response.ok && health.status === 'ok' && health.service === 'guard-api'; }
  catch { return false; }
};
if (!await healthy()) {
  console.log('Starting the Nest API on port 5184…');
  const api = launch(['run', 'dev'], path.join(root, 'apps/api'));
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await healthy()) { ready = true; break; }
    if (api.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  if (!ready) { stop(); throw new Error('The Nest API could not start. Check port 5184 and apps/api/.env.local.'); }
}
const built = spawnSync(process.execPath, ['scripts/build-web-app.mjs'], { cwd: root, stdio: 'inherit' });
if (built.status !== 0) { stop(); process.exit(built.status ?? 1); }
let running = false;
try { const response = await fetch('http://127.0.0.1:5175', { signal: AbortSignal.timeout(1500) }); running = response.ok && (await response.text()).includes('Nest'); } catch {}
if (running) console.log('Nest website is ready at http://localhost:5175 (using the existing website server).');
else launch(['run', 'dev', '--', '--strictPort'], path.join(root, 'web-earth'));
