import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const readEnv = file => existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
const api = readEnv(path.join(root, 'apps/api/.env.local'));
const mobile = readEnv(path.join(root, 'apps/mobile/.env'));
const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || api.NEXT_PUBLIC_PRIVY_APP_ID || process.env.EXPO_PUBLIC_PRIVY_APP_ID || mobile.EXPO_PUBLIC_PRIVY_APP_ID;
if (!appId) throw new Error('Set NEXT_PUBLIC_PRIVY_APP_ID in apps/api/.env.local before building the website app.');
if (mobile.EXPO_PUBLIC_PRIVY_APP_ID && mobile.EXPO_PUBLIC_PRIVY_APP_ID !== appId) throw new Error('The mobile and backend Privy app IDs must match so website and phone accounts share wallets.');
// Pass only public configuration. Backend secrets never enter the browser export.
const env = { ...process.env, EXPO_PUBLIC_PRIVY_APP_ID: appId, EXPO_PUBLIC_NEST_WEB_WALLET: 'true', EXPO_PUBLIC_DAT_API_URL: 'same-origin', NEST_WEB_BASE_PATH: '/app' };
const output = process.env.NEST_WEB_EXPORT_DIR || 'dist-website';
if (process.env.NEST_TEST_WEB_AUTH === 'true' && output !== 'dist-website-tests') throw new Error('Mock authentication builds must use dist-website-tests.');
const result = spawnSync('npm', ['run', 'export:web', '--', '--output-dir', output], { cwd: path.join(root, 'apps/mobile'), env, stdio: 'inherit', shell: process.platform === 'win32' });
if (result.error) console.error(`Could not start the Expo export: ${result.error.message}. Check that npm is installed and available on PATH.`);
process.exit(result.status ?? 1);
