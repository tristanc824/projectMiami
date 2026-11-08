/**
 * Devnet client for the family hold.
 *
 * The fee payer sponsors SOL. The sender can refund alone, without the PIN.
 * Release pays the recipient only when the approver signs and the 6-digit PIN
 * matches. The token is a test mint, not Circle USDC.
 *
 *   node hold/hold.mjs demo             lock, test the refusals, refund, lock, release, then a Safe Hold
 *   node hold/hold.mjs lock <amount> [--hold-seconds N] [--review-hash HEX]
 *                                       lock <amount> test USDC and print the PIN; with --hold-seconds
 *                                       it is a Safe Hold (cooling-off, then sender + approver sign)
 *   node hold/hold.mjs status           show the open hold, its release time and whether it is flagged
 *   node hold/hold.mjs refund           the sender cancels the current lock, any time
 *   node hold/hold.mjs release <pin>    the approver releases it (and the sender signs again on a Safe Hold)
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

// State layout from programs/family_hold/src/lib.rs.
const STATE_SIZE = 243;
const RELEASE_AFTER = 202;
const REVIEW_HASH = 210;
const FLAGS = 242;
const FLAG_SAFE_HOLD = 1;
const MAX_HOLD_SECONDS = 30 * 24 * 60 * 60;

/** Reads a hold account. Returns null when no hold is open. */
export async function readHold(connection, state) {
  const info = await connection.getAccountInfo(state);
  if (!info) return null;
  const data = info.data;
  if (data.length !== STATE_SIZE) throw new Error(`Unexpected hold size ${data.length}; redeploy the program and its client together.`);
  const key = (at) => new PublicKey(data.subarray(at, at + 32)).toBase58();
  const releaseAfter = Number(data.readBigInt64LE(RELEASE_AFTER));
  const safeHold = (data[FLAGS] & FLAG_SAFE_HOLD) !== 0;
  return {
    state: state.toBase58(),
    sender: key(1),
    approver: key(33),
    recipient: key(65),
    mint: key(97),
    amount: data.readBigUInt64LE(161).toString(),
    safeHold,
    releaseAfter: safeHold ? new Date(releaseAfter * 1000).toISOString() : null,
    reviewHash: data.subarray(REVIEW_HASH, REVIEW_HASH + 32).toString("hex"),
    needs: safeHold ? ["cooling-off over", "sender signature", "approver signature", "PIN"] : ["approver signature", "PIN"],
  };
}

export async function deposit({ connection, feePayer, sender, approver, recipient, mint, amount, pin, holdSeconds = 0, reviewHash = null }) {
  await requireProgram(connection);
  const senderAta = getAssociatedTokenAddressSync(mint, sender.publicKey);
  const [state] = statePda(sender.publicKey, approver, recipient, mint);
  const [vault] = vaultPda(state);
  const amountBytes = Buffer.alloc(8);
  amountBytes.writeBigUInt64LE(BigInt(amount));
  const seconds = Number(holdSeconds);
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > MAX_HOLD_SECONDS) throw new Error("Hold seconds must be 0 to 30 days");
  const review = reviewHash ? Buffer.from(reviewHash, "hex") : Buffer.alloc(32);
  if (review.length !== 32) throw new Error("Review hash must be 64 hex characters");
  let extra = Buffer.alloc(0);
  if (seconds > 0 || reviewHash) {
    extra = Buffer.alloc(40);
    extra.writeBigUInt64LE(BigInt(seconds), 0);
    review.copy(extra, 8);
  }
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
  ], Buffer.concat([amountBytes, pinHash(pin), extra])));
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

/**
 * Releases a hold to the recipient. `sender` is a public key, or the sender's Keypair when the
 * sender confirms again: a Safe Hold needs both the sender's and the approver's signatures.
 */
export async function release({ connection, feePayer, sender, approver, state, vault, recipientAta, mint, pin }) {
  await requireProgram(connection);
  if (!/^\d{6}$/.test(pin)) throw new Error("PIN must be 6 digits");
  const senderSigns = typeof sender?.secretKey !== "undefined";
  const senderKey = senderSigns ? sender.publicKey : sender;
  const signature = await send(connection, feePayer, senderSigns ? [approver, sender] : [approver], instruction(2, [
    { pubkey: feePayer.publicKey, isSigner: true, isWritable: true },
    { pubkey: senderKey, isSigner: senderSigns, isWritable: true },
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
const ERR = { WRONG_SENDER: 2, WRONG_PIN: 3, WRONG_APPROVER: 6, TOO_EARLY: 8 };

// Passes only when the program refuses with this exact code, so an unrelated failure
// (no SOL, a network error, a wrong account) cannot pass as a working check.
function expectFail(promise, code) {
  const wanted = code === "signature" ? "missing required signature" : `custom program error: 0x${code.toString(16)}`;
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

async function lock(ctx, amount, { holdSeconds = 0, reviewHash = null } = {}) {
  if (await holdIsOpen(ctx)) {
    throw new Error("A hold between these family members is already open. Run refund or release first.");
  }
  await fundSender(ctx, amount);
  const pin = newPin();
  const result = await deposit({
    holdSeconds,
    reviewHash,
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

function releaseArgs(ctx, pin, approver = ctx.approver, senderConfirms = false) {
  return {
    connection: ctx.connection,
    feePayer: ctx.feePayer,
    sender: senderConfirms ? ctx.sender : ctx.sender.publicKey,
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

  // Safe Hold: a flagged transfer waits out a cooling-off (20 s here, 24 h in the app), then
  // needs the sender and the approver to sign.
  const coolOff = 20;
  const safe = await lock(ctx, amount, { holdSeconds: coolOff, reviewHash: "ab".repeat(32) });
  console.log("safe hold", JSON.stringify(await readHold(ctx.connection, ctx.state)));
  const tooEarly = await expectFail(release(releaseArgs(ctx, safe.pin, ctx.approver, true)), ERR.TOO_EARLY);
  console.log("release during the cooling-off", tooEarly);
  await new Promise((resolve) => setTimeout(resolve, (coolOff + 5) * 1000));
  const approverAlone = await expectFail(release(releaseArgs(ctx, safe.pin, ctx.approver, false)), "signature");
  console.log("approver alone after the cooling-off", approverAlone);
  const beforeSafe = await balance(ctx.connection, ctx.mint, ctx.recipient.publicKey);
  await release(releaseArgs(ctx, safe.pin, ctx.approver, true));
  const safeReceived = (await balance(ctx.connection, ctx.mint, ctx.recipient.publicKey)) - beforeSafe;
  console.log("double-confirmed safe hold released", safeReceived.toString());
  if (safeReceived !== amount) throw new Error("the safe hold did not release the locked amount");
}

function option(args, name) {
  const at = args.indexOf(name);
  return at === -1 ? null : args[at + 1];
}

const commands = {
  demo: () => demo(),
  async lock(amountText, ...args) {
    const amount = toUnits(amountText);
    const holdSeconds = Number(option(args, "--hold-seconds") ?? 0);
    const reviewHash = option(args, "--review-hash");
    if (reviewHash !== null && !/^[0-9a-f]{64}$/i.test(reviewHash)) throw new Error("--review-hash must be 64 hex characters");
    const ctx = await setup();
    const { state, pin } = await lock(ctx, amount, { holdSeconds, reviewHash });
    console.log("locked", state);
    if (holdSeconds > 0) {
      const hold = await readHold(ctx.connection, ctx.state);
      console.log(`SAFE HOLD until ${hold.releaseAfter}. Then the sender and the approver must both sign. The sender can cancel any time.`);
    }
    console.log("Give this PIN to the approver. The sender does not need it to cancel.");
    console.log("PIN", pin);
  },
  async status() {
    const ctx = await setup();
    const hold = await readHold(ctx.connection, ctx.state);
    console.log(hold ? JSON.stringify(hold, null, 2) : "No hold is open.");
  },
  async refund() {
    const ctx = await setup();
    if (!(await holdIsOpen(ctx))) throw new Error("No hold is open.");
    console.log("refunded", await refund(refundArgs(ctx)));
  },
  async release(pin) {
    const ctx = await setup();
    const hold = await readHold(ctx.connection, ctx.state);
    if (!hold) throw new Error("No hold is open.");
    if (hold.safeHold && Date.now() < Date.parse(hold.releaseAfter)) {
      throw new Error(`Safe Hold: the cooling-off ends at ${hold.releaseAfter}. The sender can cancel before then.`);
    }
    // On a Safe Hold the sender confirms again: this demo holds the sender's key, so it signs here.
    console.log("released", await release(releaseArgs(ctx, String(pin ?? ""), ctx.approver, hold.safeHold)));
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
    console.error("Usage: node hold/hold.mjs demo | lock <amount> [--hold-seconds N] [--review-hash HEX] | status | refund | release <pin>");
    process.exit(1);
  }
}
