/**
 * Devnet client for the family hold.
 *
 * The fee payer sponsors SOL. The sender can refund alone, without the PIN.
 * Release pays the recipient only when the 6-digit PIN matches. The token is
 * a test mint, not Circle USDC.
 *
 *   node hold/hold.mjs demo
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { createHash, randomInt } from "crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYS = join(HERE, "keys");
export const PROGRAM_ID = new PublicKey("7NKeoXoNEgW11tgZKV18PPdktQyFHtYQ4CxJA2ffyC6g");
const RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com";
const DECIMALS = 6;

function loadOrCreate(name) {
  mkdirSync(KEYS, { recursive: true });
  const path = join(KEYS, name);
  if (!existsSync(path)) {
    writeFileSync(path, JSON.stringify(Array.from(Keypair.generate().secretKey)));
  }
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, "utf8"))));
}

function statePda(sender, approver, recipient, mint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("hold"), sender.toBuffer(), approver.toBuffer(), recipient.toBuffer(), mint.toBuffer()],
    PROGRAM_ID,
  );
}

function vaultPda(state) {
  return PublicKey.findProgramAddressSync([Buffer.from("vault"), state.toBuffer()], PROGRAM_ID);
}

function pinHash(pin) {
  if (!/^\d{6}$/.test(pin)) throw new Error("PIN must be 6 digits");
  return createHash("sha256").update(pin).digest();
}

function instruction(tag, keys, extra) {
  const body = extra ?? Buffer.alloc(0);
  const data = Buffer.alloc(1 + body.length);
  data.writeUInt8(tag, 0);
  body.copy(data, 1);
  return new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
}

async function send(connection, payer, signers, instruction) {
  const tx = new Transaction().add(instruction);
  return sendAndConfirmTransaction(connection, tx, [payer, ...signers.filter((s) => s.publicKey !== payer.publicKey)], {
    commitment: "confirmed",
  });
}

async function requireProgram(connection) {
  const info = await connection.getAccountInfo(PROGRAM_ID);
  if (!info) {
    throw new Error(
      "The family-hold program is not on this cluster yet. Deploy programs/family_hold with the key in hold/keys/program.json.",
    );
  }
}

export async function deposit({ connection, feePayer, sender, approver, recipient, mint, amount, pin }) {
  await requireProgram(connection);
  const senderAta = getAssociatedTokenAddressSync(mint, sender.publicKey);
  const [state] = statePda(sender.publicKey, approver, recipient, mint);
  const [vault] = vaultPda(state);
  const amountBytes = Buffer.alloc(8);
  amountBytes.writeBigUInt64LE(BigInt(amount));
  const signature = await send(connection, feePayer, [sender], instruction(0, [
    { pubkey: feePayer.publicKey, isSigner: true, isWritable: true },
    { pubkey: sender.publicKey, isSigner: true, isWritable: false },
    { pubkey: approver, isSigner: false, isWritable: false },
    { pubkey: recipient, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: senderAta, isSigner: false, isWritable: true },
    { pubkey: vault, isSigner: false, isWritable: true },
    { pubkey: state, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ], Buffer.concat([amountBytes, pinHash(pin)])));
  return { signature, state: state.toBase58() };
}

export async function refund({ connection, feePayer, sender, state, vault, senderAta, mint }) {
  await requireProgram(connection);
  const signature = await send(connection, feePayer, [sender], instruction(1, [
    { pubkey: feePayer.publicKey, isSigner: true, isWritable: true },
    { pubkey: sender.publicKey, isSigner: true, isWritable: true },
    { pubkey: state, isSigner: false, isWritable: true },
    { pubkey: vault, isSigner: false, isWritable: true },
    { pubkey: senderAta, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ]));
  return signature;
}

export async function release({ connection, feePayer, sender, state, vault, recipientAta, mint, pin }) {
  await requireProgram(connection);
  const signature = await send(connection, feePayer, [], instruction(2, [
    { pubkey: feePayer.publicKey, isSigner: true, isWritable: true },
    { pubkey: sender, isSigner: false, isWritable: true },
    { pubkey: state, isSigner: false, isWritable: true },
    { pubkey: vault, isSigner: false, isWritable: true },
    { pubkey: recipientAta, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ], Buffer.from(pin, "ascii")));
  return signature;
}

async function ata(connection, payer, mint, owner) {
  const address = getAssociatedTokenAddressSync(mint, owner);
  const existing = await connection.getAccountInfo(address);
  if (!existing) {
    await send(connection, payer, [], createAssociatedTokenAccountInstruction(payer.publicKey, address, owner, mint));
  }
  return address;
}

async function balance(connection, mint, owner) {
  const address = getAssociatedTokenAddressSync(mint, owner);
  const info = await connection.getAccountInfo(address);
  if (!info) return 0n;
  const account = await getAccount(connection, address);
  return account.amount;
}

function expectFail(promise) {
  return promise.then(
    () => {
      throw new Error("that signature was accepted");
    },
    () => "rejected",
  );
}

async function demo() {
  const connection = new Connection(RPC, "confirmed");
  await requireProgram(connection);
  const feePayer = loadOrCreate("fee-payer.json");
  const sender = loadOrCreate("sender.json");
  const approver = loadOrCreate("approver.json");
  const recipient = loadOrCreate("recipient.json");
  const pin = String(randomInt(0, 1000000)).padStart(6, "0");
  console.log("Test token only. This is not Circle USDC.");
  console.log("Give this PIN to the other family member. The sender does not need it to cancel.");
  console.log("PIN", pin);
  console.log("fee payer", feePayer.publicKey.toBase58());
  console.log("sender", sender.publicKey.toBase58());
  console.log("approver", approver.publicKey.toBase58());
  console.log("recipient", recipient.publicKey.toBase58());

  const start = await connection.getBalance(feePayer.publicKey);
  if (start < 1_000_000_000) {
    const sig = await connection.requestAirdrop(feePayer.publicKey, 1_000_000_000);
    await connection.confirmTransaction(sig, "confirmed");
  }

  const mint = loadOrCreate("mint.json");
  const mintRent = await getMinimumBalanceForRentExemptMint(connection);
  const mintAccount = await connection.getAccountInfo(mint.publicKey);
  if (!mintAccount) {
    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: feePayer.publicKey,
        newAccountPubkey: mint.publicKey,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(mint.publicKey, DECIMALS, feePayer.publicKey, null),
    );
    await sendAndConfirmTransaction(connection, tx, [feePayer, mint]);
  }

  const senderAta = await ata(connection, feePayer, mint.publicKey, sender.publicKey);
  await ata(connection, feePayer, mint.publicKey, recipient.publicKey);
  await send(
    connection,
    feePayer,
    [],
    createMintToInstruction(mint.publicKey, senderAta, feePayer.publicKey, 10_000_000n),
  );

  const amount = 2_000_000n;
  const first = await deposit({
    connection,
    feePayer,
    sender,
    approver: approver.publicKey,
    recipient: recipient.publicKey,
    mint: mint.publicKey,
    amount,
    pin,
  });
  const [state] = statePda(sender.publicKey, approver.publicKey, recipient.publicKey, mint.publicKey);
  const [vault] = vaultPda(state);
  console.log("locked", first.state);
  const recipientAta = getAssociatedTokenAddressSync(mint.publicKey, recipient.publicKey);

  const wrongPin = await expectFail(
    release({
      connection,
      feePayer,
      sender: sender.publicKey,
      state,
      vault,
      recipientAta,
      mint: mint.publicKey,
      pin: pin === "000000" ? "000001" : "000000",
    }),
  );
  const approverRefund = await expectFail(
    refund({
      connection,
      feePayer,
      sender: approver,
      state,
      vault,
      senderAta,
      mint: mint.publicKey,
    }),
  );
  console.log("wrong PIN", wrongPin);
  console.log("approver refund", approverRefund);

  await refund({ connection, feePayer, sender, state, vault, senderAta, mint: mint.publicKey });
  const afterRefund = await balance(connection, mint.publicKey, sender.publicKey);
  console.log("sender balance after refund", afterRefund.toString());

  await deposit({
    connection,
    feePayer,
    sender,
    approver: approver.publicKey,
    recipient: recipient.publicKey,
    mint: mint.publicKey,
    amount,
    pin,
  });
  await release({
    connection,
    feePayer,
    sender: sender.publicKey,
    state,
    vault,
    recipientAta,
    mint: mint.publicKey,
    pin,
  });
  const received = await balance(connection, mint.publicKey, recipient.publicKey);
  console.log("recipient balance after release", received.toString());
  if (received !== amount) throw new Error("recipient did not receive the locked amount");
}

const command = process.argv[2] || "demo";
if (command === "demo") {
  demo().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
} else {
  console.error("Usage: node hold/hold.mjs demo");
  process.exit(1);
}
