/**
 * Devnet client for the family hold.
 *
 * The fee payer sponsors SOL. The sender can refund alone, without the PIN.
 * Release pays the recipient only when the approver signs and the 6-digit PIN
 * matches. The token is a test mint, not Circle USDC.
 *
 *   node hold/hold.mjs demo             lock, test the refusals, refund, lock, release
 *   node hold/hold.mjs lock <amount>    lock <amount> test USDC and print the PIN
 *   node hold/hold.mjs refund           the sender cancels the current lock
 *   node hold/hold.mjs release <pin>    the approver releases it to the recipient
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
import { fileURLToPath, pathToFileURL } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYS = join(HERE, "keys");
export const PROGRAM_ID = new PublicKey("7NKeoXoNEgW11tgZKV18PPdktQyFHtYQ4CxJA2ffyC6g");
const RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com";
const DECIMALS = 6;

function loadOrCreate(name) {
  mkdirSync(KEYS, { recursive: true, mode: 0o700 });
  const path = join(KEYS, name);
  if (!existsSync(path)) {
    // Owner-only on POSIX. On Windows the folder's ACL applies; these are disposable devnet keys.
    writeFileSync(path, JSON.stringify(Array.from(Keypair.generate().secretKey)), { mode: 0o600, flag: "wx" });
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

function toUnits(amount) {
  const match = /^(\d{1,9})(?:\.(\d{1,6}))?$/.exec(String(amount ?? "").trim());
  if (!match) throw new Error("Amount must be a number of test USDC, for example 80 or 12.50");
  const units = BigInt(match[1]) * 10n ** BigInt(DECIMALS) + BigInt((match[2] ?? "").padEnd(DECIMALS, "0"));
  if (units <= 0n) throw new Error("Amount must be more than zero");
  return units;
}

async function send(connection, payer, signers, instruction) {
  const tx = new Transaction().add(instruction);
  const others = signers.filter((s) => !s.publicKey.equals(payer.publicKey));
  return sendAndConfirmTransaction(connection, tx, [payer, ...others], {
    commitment: "confirmed",
  });
}

async function requireProgram(connection) {
  const info = await connection.getAccountInfo(PROGRAM_ID);
  if (!info || !info.executable) {
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

export async function release({ connection, feePayer, sender, approver, state, vault, recipientAta, mint, pin }) {
  await requireProgram(connection);
  if (!/^\d{6}$/.test(pin)) throw new Error("PIN must be 6 digits");
  const signature = await send(connection, feePayer, [approver], instruction(2, [
    { pubkey: feePayer.publicKey, isSigner: true, isWritable: true },
    { pubkey: sender, isSigner: false, isWritable: true },
    { pubkey: approver.publicKey, isSigner: true, isWritable: false },
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

// Program error codes from programs/family_hold/src/lib.rs.
const ERR = { WRONG_SENDER: 2, WRONG_PIN: 3, WRONG_APPROVER: 6 };

// Passes only when the program refuses with this exact code, so an unrelated failure
// (no SOL, a network error, a wrong account) cannot pass as a working check.
function expectFail(promise, code) {
  const wanted = `custom program error: 0x${code.toString(16)}`;
  return promise.then(
    () => {
      throw new Error("that transaction was accepted");
    },
    (error) => {
      const text = [error?.message, ...(error?.logs ?? [])].join(" ");
      if (!text.includes(wanted)) throw error;
      return "rejected";
    },
  );
}

function newPin() {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

// Loads the four demo keypairs and the test mint, creating and funding them on first use.
async function setup() {
  const connection = new Connection(RPC, "confirmed");
  await requireProgram(connection);
  const feePayer = loadOrCreate("fee-payer.json");
  const sender = loadOrCreate("sender.json");
  const approver = loadOrCreate("approver.json");
  const recipient = loadOrCreate("recipient.json");
  console.log("Test token only. This is not Circle USDC.");
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
  const mintAccount = await connection.getAccountInfo(mint.publicKey);
  if (!mintAccount) {
    const mintRent = await getMinimumBalanceForRentExemptMint(connection);
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
  const recipientAta = await ata(connection, feePayer, mint.publicKey, recipient.publicKey);
  const [state] = statePda(sender.publicKey, approver.publicKey, recipient.publicKey, mint.publicKey);
  const [vault] = vaultPda(state);
  return { connection, feePayer, sender, approver, recipient, mint: mint.publicKey, senderAta, recipientAta, state, vault };
}

// Mints test tokens to the sender until they hold at least `amount`.
async function fundSender(ctx, amount) {
  const have = await balance(ctx.connection, ctx.mint, ctx.sender.publicKey);
  if (have >= amount) return;
  await send(ctx.connection, ctx.feePayer, [], createMintToInstruction(ctx.mint, ctx.senderAta, ctx.feePayer.publicKey, amount - have));
}

async function holdIsOpen(ctx) {
  return Boolean(await ctx.connection.getAccountInfo(ctx.state));
}

async function lock(ctx, amount) {
  if (await holdIsOpen(ctx)) {
    throw new Error("A hold between these family members is already open. Run refund or release first.");
  }
  await fundSender(ctx, amount);
  const pin = newPin();
  const result = await deposit({
    connection: ctx.connection,
    feePayer: ctx.feePayer,
    sender: ctx.sender,
    approver: ctx.approver.publicKey,
    recipient: ctx.recipient.publicKey,
    mint: ctx.mint,
    amount,
    pin,
  });
  return { ...result, pin };
}

function refundArgs(ctx, sender = ctx.sender) {
  return { connection: ctx.connection, feePayer: ctx.feePayer, sender, state: ctx.state, vault: ctx.vault, senderAta: ctx.senderAta, mint: ctx.mint };
}

function releaseArgs(ctx, pin, approver = ctx.approver) {
  return {
    connection: ctx.connection,
    feePayer: ctx.feePayer,
    sender: ctx.sender.publicKey,
    approver,
    state: ctx.state,
    vault: ctx.vault,
    recipientAta: ctx.recipientAta,
    mint: ctx.mint,
    pin,
  };
}

async function demo() {
  const ctx = await setup();
  const amount = 2_000_000n;
  if (await holdIsOpen(ctx)) {
    console.log("An earlier hold is still open. The sender refunds it before the demo starts.");
    await refund(refundArgs(ctx));
  }
  const before = await balance(ctx.connection, ctx.mint, ctx.recipient.publicKey);

  const first = await lock(ctx, amount);
  console.log("Give this PIN to the approver. The sender does not need it to cancel.");
  console.log("PIN", first.pin);
  console.log("locked", first.state);

  const wrongPin = await expectFail(release(releaseArgs(ctx, first.pin === "000000" ? "000001" : "000000")), ERR.WRONG_PIN);
  const noApprover = await expectFail(release(releaseArgs(ctx, first.pin, ctx.recipient)), ERR.WRONG_APPROVER);
  const approverRefund = await expectFail(refund(refundArgs(ctx, ctx.approver)), ERR.WRONG_SENDER);
  console.log("wrong PIN", wrongPin);
  console.log("recipient releasing without the approver", noApprover);
  console.log("approver refund", approverRefund);

  await refund(refundArgs(ctx));
  const afterRefund = await balance(ctx.connection, ctx.mint, ctx.sender.publicKey);
  console.log("sender balance after refund", afterRefund.toString());

  const second = await lock(ctx, amount);
  await release(releaseArgs(ctx, second.pin));
  const received = (await balance(ctx.connection, ctx.mint, ctx.recipient.publicKey)) - before;
  console.log("recipient received", received.toString());
  if (received !== amount) throw new Error("recipient did not receive the locked amount");
}

const commands = {
  demo: () => demo(),
  async lock(amountText) {
    const amount = toUnits(amountText);
    const ctx = await setup();
    const { state, pin } = await lock(ctx, amount);
    console.log("locked", state);
    console.log("Give this PIN to the approver. The sender does not need it to cancel.");
    console.log("PIN", pin);
  },
  async refund() {
    const ctx = await setup();
    if (!(await holdIsOpen(ctx))) throw new Error("No hold is open.");
    console.log("refunded", await refund(refundArgs(ctx)));
  },
  async release(pin) {
    const ctx = await setup();
    if (!(await holdIsOpen(ctx))) throw new Error("No hold is open.");
    console.log("released", await release(releaseArgs(ctx, String(pin ?? ""))));
  },
};

// Run the CLI only when this file is the entry point, so importing deposit/refund/release has no side effects.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command = "demo", ...rest] = process.argv.slice(2);
  if (Object.hasOwn(commands, command)) {
    commands[command](...rest).catch((error) => {
      console.error(error.message || error);
      process.exit(1);
    });
  } else {
    console.error("Usage: node hold/hold.mjs demo | lock <amount> | refund | release <pin>");
    process.exit(1);
  }
}
