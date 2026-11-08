// Local deployment-only throttle. Upstream credentials and payloads are never logged.
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const env = fileURLToPath(new URL('../apps/api/.env.local', import.meta.url));
if (existsSync(env)) process.loadEnvFile(env);
const upstream = process.env.SOLANA_RPC_URL;
if (!upstream || new URL(upstream).protocol !== 'https:') throw new Error('Configure an HTTPS devnet RPC first.');
async function forward(body) {
  const response = await fetch(upstream, { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: AbortSignal.timeout(25000) });
  return { status: response.status, text: await response.text() };
}
const genesis = await forward(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getGenesisHash' }));
if (JSON.parse(genesis.text).result !== 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG') throw new Error('Refusing a non-devnet upstream.');
let next = 0;
const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/') { res.writeHead(405); res.end(); return; }
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 2_000_000) { res.writeHead(413); res.end(); return; } }
  try {
    const message = JSON.parse(body);
    if (!message.method || !/^(get|is|sendTransaction$|simulateTransaction$)/.test(message.method)) { res.writeHead(400); res.end(); return; }
    const start = Math.max(Date.now(), next); next = start + 200;
    await new Promise(resolve => setTimeout(resolve, Math.max(0, start - Date.now())));
    const response = await forward(body);
    res.writeHead(response.status, { 'content-type': 'application/json' }); res.end(response.text);
  } catch { res.writeHead(502); res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Devnet RPC request did not finish.' } })); }
});
server.listen(18897, '127.0.0.1', () => console.log('Devnet-only deployment proxy ready on 127.0.0.1:18897 (5 requests/second).'));
