// Explicit operator command; never run by builds/tests. No mainnet mode exists.
// Default: read-only checks. --deploy rebuilds with --locked and spends test SOL.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, isAbsolute, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args.some(arg => !['--check', '--deploy'].includes(arg)) || args.includes('--check') && args.includes('--deploy')) {
  throw new Error('Usage: node scripts/deploy-hold-devnet.mjs [--check | --deploy]');
}
const deploy = args.includes('--deploy');
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const envFile = join(root, 'apps/api/.env.local');
if (existsSync(envFile)) process.loadEnvFile(envFile);
const { feePayer } = await import('../apps/api/lib/server/solana.mjs');
const { HOLD_PROGRAM_ID } = await import('../apps/api/lib/hold.mjs');
const cli = process.env.SOLANA_1_18_BIN || 'solana';
const build = isAbsolute(cli) ? join(dirname(cli), 'cargo-build-sbf') : 'cargo-build-sbf';
// Do not forward provider/wallet secrets to the compiler or CLI environment.
const childEnv = { NO_DNA: '1' };
for (const name of ['PATH', 'HOME', 'USER', 'TMPDIR', 'CARGO_HOME', 'RUSTUP_HOME', 'SSL_CERT_FILE']) {
  if (process.env[name]) childEnv[name] = process.env[name];
}
if (isAbsolute(cli)) childEnv.PATH = `${dirname(cli)}${delimiter}${childEnv.PATH || ''}`;
function run(command, argv, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argv, { cwd, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', () => reject(new Error(`Could not start ${command}. Install Solana 1.18.26 or set SOLANA_1_18_BIN.`)));
    child.on('close', code => {
      if (code === 0) return resolve(stdout);
      // Never dump raw CLI recovery/key material on an error.
      const detail = /EOF while parsing/i.test(stderr) ? 'signer EOF' : /insufficient funds/i.test(stderr) ? 'insufficient devnet SOL' : /429|rate.limit/i.test(stderr) ? 'RPC rate limit' : 'inspect toolchain/configuration';
      reject(new Error(`Command stopped (exit ${code}; ${detail}). No further deployment steps were run.`));
    });
  });
}
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const keys = join(root, 'hold/keys');
const programFile = join(keys, 'program.json');
const sourceFile = join(root, 'programs/family_hold/src/lib.rs');
const binaryFile = join(root, 'programs/family_hold/target/deploy/family_hold.so');
const lockFile = join(root, 'programs/family_hold/Cargo.lock');
const version = await run(cli, ['--version']);
if (!/^solana-cli 1\.18\.26\b/.test(version)) throw new Error('Solana CLI 1.18.26 is required; refusing another toolchain.');
const programKey = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(programFile, 'utf8'))));
if (!programKey.publicKey.equals(HOLD_PROGRAM_ID)) throw new Error('Program keypair and app program ID do not match.');
const source = readFileSync(sourceFile, 'utf8');
if (!source.includes(`declare_id!("${HOLD_PROGRAM_ID.toBase58()}")`)) throw new Error('Rust program ID does not match the app.');
const payer = feePayer();
if (!source.includes(`const POLICY_AUTHORITY: Pubkey = solana_program::pubkey!("${payer.publicKey.toBase58()}")`)) throw new Error('Policy authority does not match the API fee payer.');
const rpcUrl = process.env.NEST_DEPLOY_RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(rpcUrl, 'confirmed');
if (await connection.getGenesisHash() !== 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG') throw new Error('Devnet genesis check failed.');
const existing = await connection.getAccountInfo(HOLD_PROGRAM_ID);
if (existing) throw new Error('Program account already exists. Inspect it before an upgrade; this command only handles an initial deploy.');
const lockedHash = hash(lockFile);
if (deploy) {
  console.log('Rebuilding Safe Hold with Solana 1.18.26 and --locked.');
  await run(build, ['--', '--locked'], join(root, 'programs/family_hold'));
  if (hash(lockFile) !== lockedHash) throw new Error('Cargo.lock changed; deployment refused.');
}
if (!existsSync(binaryFile) || statSync(binaryFile).mtimeMs < statSync(sourceFile).mtimeMs) throw new Error('A current rebuilt target/deploy/family_hold.so is required.');
const balance = await connection.getBalance(payer.publicKey);
const rent = await connection.getMinimumBalanceForRentExemption(statSync(binaryFile).size + 45);
const bufferFile = join(keys, 'deploy-buffer.json');
let bufferLamports = 0;
if (existsSync(bufferFile)) {
  const bufferKey = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(bufferFile, 'utf8'))));
  const bufferInfo = await connection.getAccountInfo(bufferKey.publicKey);
  if (bufferInfo) {
    if (!bufferInfo.owner.equals(new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111')) || bufferInfo.data.length < 37 || bufferInfo.data.readUInt32LE(0) !== 1 || bufferInfo.data[4] !== 1 || !new PublicKey(bufferInfo.data.subarray(5, 37)).equals(payer.publicKey)) throw new Error('Existing buffer has an unexpected owner or authority.');
    bufferLamports = bufferInfo.lamports;
  }
}
if (balance < rent * 3 + 50_000_000 - bufferLamports) throw new Error('Insufficient devnet SOL for a conservative program/buffer rent and fee reserve.');
console.log(JSON.stringify({ mode: deploy ? 'deploy' : 'read-only check', cluster: 'devnet', programId: HOLD_PROGRAM_ID.toBase58(), payer: payer.publicKey.toBase58(), payerSOL: balance / 1e9, binarySHA256: hash(binaryFile), cargoLockSHA256: lockedHash }));
if (deploy) {
  mkdirSync(keys, { recursive: true, mode: 0o700 });
  const buffer = join(keys, 'deploy-buffer.json');
  if (!existsSync(buffer)) writeFileSync(buffer, JSON.stringify(Array.from(Keypair.generate().secretKey)), { mode: 0o600, flag: 'wx' });
  const temporary = mkdtempSync(join(keys, '.deployer-'));
  try {
    const signer = join(temporary, 'payer.json');
    writeFileSync(signer, JSON.stringify(Array.from(payer.secretKey)), { mode: 0o600, flag: 'wx' });
    await run(cli, ['program', 'deploy', binaryFile, '--program-id', programFile, '--buffer', buffer, '-u', rpcUrl, '-k', signer, '--use-rpc', '--output', 'json']);
    const info = await connection.getAccountInfo(HOLD_PROGRAM_ID);
    if (!info?.executable) throw new Error('Deployment returned but executable program verification failed.');
    const output = JSON.parse(await run(cli, ['program', 'show', HOLD_PROGRAM_ID.toBase58(), '-u', rpcUrl, '-k', signer, '--output', 'json']));
    console.log(JSON.stringify({ deployed: true, programId: HOLD_PROGRAM_ID.toBase58(), owner: info.owner.toBase58(), authority: output.authority, verifiedAt: new Date().toISOString(), explorer: `https://explorer.solana.com/address/${HOLD_PROGRAM_ID.toBase58()}?cluster=devnet` }));
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
