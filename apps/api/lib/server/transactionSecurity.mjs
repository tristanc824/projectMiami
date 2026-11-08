const DEFAULT_RPC = 'https://api.devnet.solana.com';
const MAX_MESSAGE_BYTES = 2_048;
const MAX_BLOCKHEIGHT_AHEAD = 300;

/** The repository's raw Keypair path is a devnet convenience, never production custody. */
export function assertSoftwareKeysAllowed(rpcUrl = process.env.SOLANA_RPC_URL || DEFAULT_RPC, cluster = process.env.SOLANA_CLUSTER || '') {
  const endpoint = String(rpcUrl).toLowerCase();
  const named = String(cluster).toLowerCase();
  const local = endpoint.includes('127.0.0.1') || endpoint.includes('localhost');
  const devnet = endpoint.includes('devnet') || named === 'devnet' || named === 'localnet';
  if (endpoint.includes('mainnet') || named === 'mainnet' || named === 'mainnet-beta' || (!local && !devnet)) {
    throw new Error('Raw software signing keys are disabled outside devnet/localnet; use an external MPC or HSM signer');
  }
}

function strictBase64(value, label, expectedBytes, maxBytes = expectedBytes) {
  if (typeof value !== 'string' || !value || value.length > Math.ceil(maxBytes / 3) * 4 + 4
      || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length < expectedBytes || bytes.length > maxBytes || bytes.toString('base64') !== value) {
    throw new Error(`Invalid ${label}`);
  }
  return bytes;
}

export function decodeTransferSubmission(messageB64, signatureB64) {
  return {
    message: strictBase64(messageB64, 'transaction message', 1, MAX_MESSAGE_BYTES),
    signature: strictBase64(signatureB64, 'wallet signature', 64),
  };
}

export function validateLastValidBlockHeight(value, current) {
  if (!Number.isSafeInteger(value) || !Number.isSafeInteger(current) || value < current || value > current + MAX_BLOCKHEIGHT_AHEAD) {
    throw new Error('Invalid transaction expiry');
  }
  return value;
}
