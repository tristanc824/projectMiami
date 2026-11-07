import { TransactionMessage, VersionedMessage } from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  decodeTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { USDC_DECIMALS } from './money.mjs';

// The fee payer covers the network fee and, if needed, the recipient's token account. The owner signs the transfer.
export function buildTransferMessage({ feePayer, owner, recipient, mint, amount, blockhash }) {
  const source = getAssociatedTokenAddressSync(mint, owner);
  const destination = getAssociatedTokenAddressSync(mint, recipient);
  return new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions: [
      createAssociatedTokenAccountIdempotentInstruction(feePayer, destination, recipient, mint),
      createTransferCheckedInstruction(source, mint, destination, owner, amount, USDC_DECIMALS),
    ],
  }).compileToV0Message();
}

// The fee payer co-signs whatever reaches it, so only an exact USDC transfer from the signed-in user may pass.
export function assertSponsorable(messageBytes, { feePayer, owner, mint }) {
  const message = VersionedMessage.deserialize(messageBytes);
  if (message.addressTableLookups?.length) throw new Error('Lookup tables are not allowed');
  const keys = message.staticAccountKeys;
  if (message.header.numRequiredSignatures !== 2) throw new Error('Unexpected signers');
  if (!keys[0].equals(feePayer)) throw new Error('Fee payer must be first');
  if (!keys[1].equals(owner)) throw new Error('Signer must be the wallet owner');
  if (owner.equals(feePayer)) throw new Error('Owner cannot be the fee payer');

  const { instructions } = TransactionMessage.decompile(message);
  if (instructions.length < 1 || instructions.length > 2) throw new Error('Unexpected instructions');
  const transferIx = instructions[instructions.length - 1];
  if (!transferIx.programId.equals(TOKEN_PROGRAM_ID)) throw new Error('Only token transfers are allowed');
  const { keys: t, data } = decodeTransferCheckedInstruction(transferIx, TOKEN_PROGRAM_ID);
  if (t.multiSigners.length) throw new Error('Multisig is not allowed');
  if (!t.mint.pubkey.equals(mint) || data.decimals !== USDC_DECIMALS) throw new Error('Only USDC is allowed');
  if (!t.owner.pubkey.equals(owner)) throw new Error('Transfer must come from the owner');
  if (!t.source.pubkey.equals(getAssociatedTokenAddressSync(mint, owner))) throw new Error('Unexpected source');
  if (data.amount <= 0n) throw new Error('Amount must be positive');

  if (instructions.length === 2) {
    const ata = instructions[0];
    const idempotent = ata.data.length === 1 && ata.data[0] === 1;
    if (!ata.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID) || !idempotent) throw new Error('Unexpected instruction');
    if (ata.keys.length !== 6 || !ata.keys[0].pubkey.equals(feePayer)) throw new Error('Unexpected account setup');
    const expected = getAssociatedTokenAddressSync(mint, ata.keys[2].pubkey);
    if (!ata.keys[3].pubkey.equals(mint) || !ata.keys[1].pubkey.equals(expected)) throw new Error('Unexpected account');
    if (!ata.keys[1].pubkey.equals(t.destination.pubkey)) throw new Error('Account does not match transfer');
  }
  return { message, amount: data.amount, destination: t.destination.pubkey };
}
