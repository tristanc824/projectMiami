// One-time setup for text payments. Run from apps/api: node scripts/setup-text-payments.mjs
// Creates Nest's server signer (an authorization key in a 1-of-1 key quorum) and the policy that limits it
// to USDC transfers of at most $10, then saves them to .env.local. The private key is never printed.
import crypto from 'node:crypto';
import { appendEnv, loadEnv } from './env.mjs';

loadEnv();
const { privyApi } = await import('../lib/server/signer.mjs');
const { USDC_MINT } = await import('../lib/server/solana.mjs');
const { TEXT_LIMITS } = await import('../lib/sms.mjs');
const ATA_PROGRAM = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

if (process.env.PRIVY_SIGNER_ID && process.env.PRIVY_POLICY_ID && process.env.PRIVY_AUTHORIZATION_KEY) {
  console.log('Text payments are already set up in .env.local. Nothing to do.');
  process.exit(0);
}

const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const quorum = await privyApi('/key_quorums', {
  method: 'POST',
  body: {
    display_name: 'Nest text payments',
    public_keys: [publicKey.export({ type: 'spki', format: 'der' }).toString('base64')],
    authorization_threshold: 1,
  },
});

const policy = await privyApi('/policies', {
  method: 'POST',
  body: {
    version: '1.0',
    name: 'Nest text payments: USDC up to $10',
    chain_type: 'solana',
    rules: [
      {
        name: 'USDC transfers up to $10',
        method: 'signTransaction',
        action: 'ALLOW',
        conditions: [
          { field_source: 'solana_token_program_instruction', field: 'instructionName', operator: 'eq', value: 'TransferChecked' },
          { field_source: 'solana_token_program_instruction', field: 'TransferChecked.mint', operator: 'eq', value: USDC_MINT.toBase58() },
          { field_source: 'solana_token_program_instruction', field: 'TransferChecked.amount', operator: 'lte', value: TEXT_LIMITS.perPayment.toString() },
        ],
      },
      {
        name: "Create the recipient's USDC account",
        method: 'signTransaction',
        action: 'ALLOW',
        conditions: [{ field_source: 'solana_program_instruction', field: 'programId', operator: 'eq', value: ATA_PROGRAM }],
      },
    ],
  },
});

appendEnv({
  PRIVY_AUTHORIZATION_KEY: `wallet-auth:${privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64')}`,
  PRIVY_SIGNER_ID: quorum.id,
  PRIVY_POLICY_ID: policy.id,
});
console.log(`Saved to .env.local. Signer (key quorum) ${quorum.id}, policy ${policy.id}.`);
console.log('Add the same three PRIVY_ values to the Vercel project before deploying.');
