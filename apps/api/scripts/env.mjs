import fs from 'node:fs';

export const ENV_FILE = '.env.local';

// Loads .env.local into process.env without printing anything from it.
export function loadEnv(file = ENV_FILE) {
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i > 0 && !line.trimStart().startsWith('#')) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

export function appendEnv(values, file = ENV_FILE) {
  const existing = fs.readFileSync(file, 'utf8');
  const lines = Object.entries(values).map(([k, v]) => `${k}=${v}`).join('\n');
  fs.appendFileSync(file, `${existing.endsWith('\n') ? '' : '\n'}${lines}\n`);
}
