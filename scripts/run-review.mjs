import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const envFile = fileURLToPath(new URL('../.env.review.local', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);
// python.org macOS builds may lack their own installed CA bundle. Keep TLS
// verification enabled and use the operating system's trust bundle instead.
if (process.platform === 'darwin' && !process.env.SSL_CERT_FILE && existsSync('/etc/ssl/cert.pem')) process.env.SSL_CERT_FILE = '/etc/ssl/cert.pem';
const args = process.argv.slice(2);
// Match this checkout's Next proxy without exporting any unrelated backend secrets.
const apiEnvFile = fileURLToPath(new URL('../apps/api/.env.local', import.meta.url));
const apiEnv = existsSync(apiEnvFile) ? parseEnv(readFileSync(apiEnvFile, 'utf8')) : {};
if (!process.env.REVIEW_API_TOKEN && apiEnv.REVIEW_API_TOKEN) process.env.REVIEW_API_TOKEN = apiEnv.REVIEW_API_TOKEN;
if (!args.includes('--check') && !args.includes('--port')) {
  let port = process.env.REVIEW_PORT || '8000';
  try {
    const url = new URL(apiEnv.REVIEW_API_URL || 'http://127.0.0.1:8000');
    if (!process.env.REVIEW_PORT && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) port = url.port || '8000';
  } catch { /* The API reports its own invalid URL; use the default local port. */ }
  args.push('--port', port);
}
const child = spawn(process.env.PYTHON || 'python3', ['app.py', ...args], { cwd: root, env: process.env, stdio: 'inherit' });
child.on('error', () => { console.error('Could not start Python. Set PYTHON to your Python 3.10+ executable.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
