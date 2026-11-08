import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const build = spawnSync(process.execPath, ['scripts/build-web-app.mjs'], { cwd: root, env: { ...process.env, NEST_TEST_WEB_AUTH: 'true', NEST_WEB_EXPORT_DIR: 'dist-website-tests' }, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
const test = spawnSync('npm', ['run', 'test:website', '--', ...process.argv.slice(2)], { cwd: path.join(root, 'apps/mobile'), stdio: 'inherit' });
process.exit(test.status ?? 1);
