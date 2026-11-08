/**
 * Penetration tests for the family hold program, run against a local solana-test-validator.
 *
 * Every check in programs/family_hold/src/lib.rs is attacked here, and each attack must be refused
 * with the exact error the program is meant to give, with no tokens moving. Controls show the honest
 * paths still work, so a program that refused everything could not pass.
 *
 *   ARGS=$(node hold/attack-fixtures.mjs /tmp/fx)
 *   solana-test-validator --reset --bpf-program 7NKeoXoNEgW11tgZKV18PPdktQyFHtYQ4CxJA2ffyC6g family_hold.so $ARGS
 *   HOLD_FIXTURES=/tmp/fx node --test hold/attacks.test.mjs
 *
 * Optional: POLICY_AUTHORITY_KEYPAIR (the JSON array) or hold/keys/policy-authority.json adds the
 * end-to-end controls that need the review server's co-signature. Without it they are skipped, and
 * the fixture holds cover the same program paths.
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import {
  Connection,
  Keypair,
  NONCE_ACCOUNT_LENGTH,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import * as hold from "./hold.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RPC = process.env.SOLANA_RPC || "http://127.0.0.1:8899";
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(RPC)) {
  throw new Error(`The attack tests run only against a local validator, not ${RPC}.`);
}
const DAY = 24 * 60 * 60;
const PIN = "246810";
const REVIEW = createHash("sha256").update("attack test review").digest("hex");
const { ERR } = hold;

// ---- What this run can use --------------------------------------------------------------------

const keypair = (secret) => Keypair.fromSecretKey(Uint8Array.from(secret));
const FIX = process.env.HOLD_FIXTURES ? JSON.parse(readFileSync(join(process.env.HOLD_FIXTURES, "fixtures.json"), "utf8")) : null;
const POLICY = (() => {
  const raw = process.env.POLICY_AUTHORITY_KEYPAIR?.trim()
    || (existsSync(join(HERE, "keys", "policy-authority.json")) ? readFileSync(join(HERE, "keys", "policy-authority.json"), "utf8") : "");
  if (!raw) return null;
  const key = keypair(JSON.parse(raw));
  return key.publicKey.equals(hold.POLICY_AUTHORITY) ? key : null;
})();
const NEEDS = {
  fixtures: FIX ? null : "no HOLD_FIXTURES: start the validator with node hold/attack-fixtures.mjs",
  policy: POLICY ? null : "no policy authority key (POLICY_AUTHORITY_KEYPAIR): the fixture holds cover these paths",
};

// ---- The attack log ---------------------------------------------------------------------------

const LOG = [];
const codeName = (code) => (typeof code === "number" ? `${Object.keys(ERR).find((k) => ERR[k] === code)} (${code})` : code);

after(() => {
  const width = Math.max(...LOG.map((row) => row.name.length));
  const lines = [
    `ON-CHAIN ATTACK LOG: family hold program ${hold.PROGRAM_ID.toBase58()} on a local validator`,
    "",
    ...LOG.map((row) => `[${row.outcome.padEnd(7)}] ${row.area.padEnd(9)} ${row.name.padEnd(width)}  ${row.detail}`),
    "",
    `${LOG.filter((r) => r.outcome === "BLOCKED").length} attacks blocked, `
      + `${LOG.filter((r) => r.outcome === "OK").length} controls passed, `
      + `${LOG.filter((r) => r.outcome === "SKIPPED").length} skipped, `
      + `${LOG.filter((r) => ["GOT IN", "WRONG"].includes(r.outcome)).length} got through or failed for the wrong reason.`,
  ];
  const text = lines.join("\n");
  console.log(`\n${text}\n`);
  if (process.env.ATTACK_LOG) writeFileSync(process.env.ATTACK_LOG, `${text}\n`);
});

// ---- Shared accounts --------------------------------------------------------------------------

let conn;
let feePayer;
let attacker;
let mintA; // the hold's mint
let mintB; // a second mint, for wrong-mint attacks
let attackerAtaA;
const fx = {}; // fixture keys and accounts

const meta = (pubkey, isSigner = false, isWritable = false) => ({ pubkey, isSigner, isWritable });
const ata = (mint, owner) => getAssociatedTokenAddressSync(mint, owner);
const u64 = (value) => {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(BigInt(value));
  return bytes;
};

async function submit(signers, ...instructions) {
  const unique = [feePayer, ...signers.filter((s, i, all) => !s.publicKey.equals(feePayer.publicKey)
    && all.findIndex((o) => o.publicKey.equals(s.publicKey)) === i)];
  return sendAndConfirmTransaction(conn, new Transaction().add(...instructions), unique, { commitment: "confirmed" });
}

async function airdrop(to, sol) {
  const signature = await conn.requestAirdrop(to, sol * 1e9);
  const latest = await conn.getLatestBlockhash();
  await conn.confirmTransaction({ signature, ...latest }, "confirmed");
}

async function newMint() {
  const mint = Keypair.generate();
  const rent = await getMinimumBalanceForRentExemptMint(conn);
  await submit([mint],
    SystemProgram.createAccount({ fromPubkey: feePayer.publicKey, newAccountPubkey: mint.publicKey, space: MINT_SIZE, lamports: rent, programId: TOKEN_PROGRAM_ID }),
    createInitializeMintInstruction(mint.publicKey, 6, feePayer.publicKey, null));
  return mint.publicKey;
}

const ataIx = (mint, owner) => createAssociatedTokenAccountIdempotentInstruction(feePayer.publicKey, ata(mint, owner), owner, mint);

before(async () => {
  conn = new Connection(RPC, "confirmed");
  feePayer = Keypair.generate();
  attacker = Keypair.generate();
  await airdrop(feePayer.publicKey, 100);
  mintA = await newMint();
  mintB = await newMint();
  attackerAtaA = ata(mintA, attacker.publicKey);
  await submit([], ataIx(mintA, attacker.publicKey), createMintToInstruction(mintA, attackerAtaA, feePayer.publicKey, 1_000_000n));
  if (FIX) {
    Object.assign(fx, {
      mint: new PublicKey(FIX.mint),
      sender: keypair(FIX.sender),
      approver: keypair(FIX.approver),
      recipient: keypair(FIX.recipient),
      attacker: keypair(FIX.attacker),
      safe: { ...FIX.holds.expiredSafe, state: new PublicKey(FIX.holds.expiredSafe.state), vault: new PublicKey(FIX.holds.expiredSafe.vault) },
      ordinary: { ...FIX.holds.ordinary, state: new PublicKey(FIX.holds.ordinary.state), vault: new PublicKey(FIX.holds.ordinary.vault) },
      foreign: new PublicKey(FIX.forged.foreignOwner),
      nonPda: new PublicKey(FIX.forged.nonPda),
    });
    fx.recipientAta = ata(fx.mint, fx.recipient.publicKey);
    fx.attackerAta = ata(fx.mint, fx.attacker.publicKey);
    fx.senderAta = ata(fx.mint, fx.sender.publicKey);
    await submit([], ataIx(fx.mint, fx.recipient.publicKey), ataIx(fx.mint, fx.attacker.publicKey), ataIx(fx.mint, fx.sender.publicKey));
  }
});

/** A fresh sender, approver and recipient with funded token accounts, so tests never share a hold. */
async function family({ approverIsSender = false } = {}) {
  const sender = Keypair.generate();
  const approver = Keypair.generate();
  const recipient = Keypair.generate();
  const approverKey = approverIsSender ? sender.publicKey : approver.publicKey;
  await submit([],
    ataIx(mintA, sender.publicKey), ataIx(mintA, recipient.publicKey), ataIx(mintB, sender.publicKey),
    createMintToInstruction(mintA, ata(mintA, sender.publicKey), feePayer.publicKey, 5_000_000n),
    createMintToInstruction(mintB, ata(mintB, sender.publicKey), feePayer.publicKey, 5_000_000n));
  const [state] = hold.statePda(sender.publicKey, approverKey, recipient.publicKey, mintA);
  const [vault] = hold.vaultPda(state);
  return {
    sender, approver, recipient, approverKey, state, vault, mint: mintA,
    senderAta: ata(mintA, sender.publicKey), senderAtaB: ata(mintB, sender.publicKey), recipientAta: ata(mintA, recipient.publicKey),
  };
}

/** The deposit instruction, with any part swapped out for an attack. */
function depositIx(f, {
  amount = 1_000_000n, holdSeconds = DAY, reviewHash = REVIEW, data, keys = {}, policy = null, policySigns = true, senderSigns = true, tag = 0,
} = {}) {
  const k = {
    sender: f.sender.publicKey, approver: f.approverKey, recipient: f.recipient.publicKey, mint: f.mint, senderToken: f.senderAta,
    vault: f.vault, state: f.state, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId, ...keys,
  };
  const body = data ?? Buffer.concat([u64(amount), hold.pinHash(PIN), u64(holdSeconds), Buffer.from(reviewHash, "hex")]);
  const accounts = [
    meta(feePayer.publicKey, true, true), meta(k.sender, senderSigns), meta(k.approver), meta(k.recipient), meta(k.mint),
    meta(k.senderToken, false, true), meta(k.vault, false, true), meta(k.state, false, true), meta(k.tokenProgram), meta(k.systemProgram),
  ];
  if (policy) accounts.push(meta(policy, policySigns));
  return hold.instruction(tag, accounts, body);
}

async function openSafeHold(f, { holdSeconds = DAY } = {}) {
  const policy = holdSeconds < DAY ? POLICY : null;
  await submit(policy ? [f.sender, policy] : [f.sender], depositIx(f, { holdSeconds, policy: policy?.publicKey ?? null }));
  return f;
}

const refundIx = ({ sender, senderSigns = true, state, vault, destination, mint }) => hold.instruction(1, [
  meta(feePayer.publicKey, true, true), meta(sender, senderSigns, true), meta(state, false, true), meta(vault, false, true),
  meta(destination, false, true), meta(mint), meta(TOKEN_PROGRAM_ID),
]);

const releaseIx = ({ sender, approver, state, vault, destination, mint, pin }) => hold.instruction(2, [
  meta(feePayer.publicKey, true, true), meta(sender, false, true), meta(approver, true), meta(state, false, true),
  meta(vault, false, true), meta(destination, false, true), meta(mint), meta(TOKEN_PROGRAM_ID),
], Buffer.from(pin, "ascii"));

function confirmIx({ sender, senderSigns = true, state, vault, destination, mint, sysvar, omitSysvar = false, extraData = false }) {
  const ix = hold.confirmInstruction({ feePayer: feePayer.publicKey, sender, state, vault, recipientAta: destination, mint, instructionsSysvar: sysvar });
  ix.keys[1].isSigner = senderSigns;
  if (omitSysvar) ix.keys.pop();
  if (extraData) ix.data = Buffer.from([3, 1]);
  return ix;
}

async function snapshot(addresses) {
  return Promise.all(addresses.map(async (address) => {
    const info = await conn.getAccountInfo(address);
    if (!info) return "none";
    if (info.owner.equals(TOKEN_PROGRAM_ID) && info.data.length === 165) return `tokens:${(await getAccount(conn, address)).amount}`;
    return `lamports:${info.lamports}`;
  }));
}

// ---- Test helpers that also write the log ------------------------------------------------------

function skipReason(needs) {
  return needs.map((need) => NEEDS[need]).filter(Boolean).join("; ") || false;
}

/** An attack: `setup` returns the attempt and the accounts that must not change. */
function attack(area, name, expected, setup, { needs = [] } = {}) {
  const skip = skipReason(needs);
  if (skip) LOG.push({ area, name, outcome: "SKIPPED", detail: skip });
  test(`${area}: ${name}`, { skip }, async () => {
    const { attempt, watch } = await setup();
    const before = await snapshot(watch);
    try {
      await hold.expectFail(attempt(), expected);
    } catch (error) {
      const accepted = /that transaction was accepted/.test(error.message);
      LOG.push({ area, name, outcome: accepted ? "GOT IN" : "WRONG", detail: accepted ? "the program accepted it" : `expected ${codeName(expected)}: ${String(error.message).split("\n")[0]}` });
      throw error;
    }
    assert.deepEqual(await snapshot(watch), before, "an account changed although the transaction was refused");
    LOG.push({ area, name, outcome: "BLOCKED", detail: `refused: ${codeName(expected)}, no tokens moved` });
  });
}

/** A control: an honest action that must succeed. `run` returns a short description of the result. */
function control(area, name, run, { needs = [] } = {}) {
  const skip = skipReason(needs);
  if (skip) LOG.push({ area, name: `Control: ${name}`, outcome: "SKIPPED", detail: skip });
  test(`${area}: control: ${name}`, { skip }, async () => {
    try {
      LOG.push({ area, name: `Control: ${name}`, outcome: "OK", detail: await run() });
    } catch (error) {
      LOG.push({ area, name: `Control: ${name}`, outcome: "WRONG", detail: String(error.message).split("\n")[0] });
      throw error;
    }
  });
}

// =============================================================================================
// Deposit
// =============================================================================================

const depositAttack = (name, expected, options, { signers, family: famOptions, needs } = {}) =>
  attack("deposit", name, expected, async () => {
    const f = await family(famOptions);
    const opts = typeof options === "function" ? options(f) : options;
    return {
      attempt: () => submit(signers ? signers(f) : opts.senderSigns === false ? [] : [f.sender], depositIx(f, opts)),
      watch: [f.senderAta, f.state, f.vault],
    };
  }, { needs });

attack("deposit", "Unknown instruction tag (7)", ERR.BAD_INSTRUCTION, async () => {
  const f = await family();
  return { attempt: () => submit([f.sender], depositIx(f, { tag: 7 })), watch: [f.senderAta, f.state] };
});
attack("deposit", "Empty instruction data", ERR.BAD_INSTRUCTION, async () => {
  const f = await family();
  const ix = depositIx(f);
  return { attempt: () => submit([f.sender], new TransactionInstruction({ programId: hold.PROGRAM_ID, keys: ix.keys, data: Buffer.alloc(0) })), watch: [f.senderAta, f.state] };
});
depositAttack("Deposit data one byte short (79 bytes)", "instructionData", { data: Buffer.alloc(79, 1) });
depositAttack("Deposit of zero tokens", "instructionData", { amount: 0n });
depositAttack("Hold longer than 30 days", ERR.BAD_HOLD, { holdSeconds: 31 * DAY });
depositAttack("All-zero review hash (no review)", ERR.BAD_HOLD, { reviewHash: "0".repeat(64) });
depositAttack("Approver is the recipient", ERR.SAME_PERSON, (f) => ({ keys: { approver: f.recipient.publicKey, ...pdas(f, f.recipient.publicKey) } }));
depositAttack("Ordinary hold where the sender approves their own transfer", ERR.SAME_PERSON,
  (f) => ({ holdSeconds: 0, keys: { approver: f.sender.publicKey, ...pdas(f, f.sender.publicKey) } }));
depositAttack("Express hold (no cooling-off) without the review server", ERR.NEEDS_POLICY_COSIGN, { holdSeconds: 0 });
depositAttack("Express hold naming the review server, which did not sign", ERR.NEEDS_POLICY_COSIGN,
  { holdSeconds: 0, policy: hold.POLICY_AUTHORITY, policySigns: false });
{
  const impostor = Keypair.generate();
  depositAttack("Express hold co-signed by an impostor 'server'", ERR.NEEDS_POLICY_COSIGN,
    { holdSeconds: 0, policy: impostor.publicKey }, { signers: (f) => [f.sender, impostor] });
}
depositAttack("Safe Hold shortened to 60 s without the review server", ERR.NEEDS_POLICY_COSIGN, { holdSeconds: 60 });
depositAttack("Deposit the sender did not sign", "signature", { senderSigns: false });
attack("deposit", "Deposit from someone else's token account", ERR.WRONG_OWNER, async () => {
  const f = await family();
  return { attempt: () => submit([f.sender], depositIx(f, { keys: { senderToken: attackerAtaA } })), watch: [attackerAtaA, f.state] };
});
depositAttack("Deposit from a token account of another mint", ERR.WRONG_MINT, (f) => ({ keys: { senderToken: f.senderAtaB } }));
depositAttack("Fake token program", "programId", { keys: { tokenProgram: Keypair.generate().publicKey } });
depositAttack("Fake system program", "programId", { keys: { systemProgram: Keypair.generate().publicKey } });
depositAttack("Hold account that is not the hold's address (PDA)", "seeds", { keys: { state: Keypair.generate().publicKey } });
depositAttack("Vault that is not the vault's address (PDA)", "seeds", { keys: { vault: Keypair.generate().publicKey } });

function pdas(f, approver) {
  const [state] = hold.statePda(f.sender.publicKey, approver, f.recipient.publicKey, f.mint);
  return { state, vault: hold.vaultPda(state)[0] };
}

control("deposit", "The sender alone opens a 24-hour Safe Hold (no server needed)", async () => {
  const f = await openSafeHold(await family());
  const held = await hold.readHold(conn, f.state);
  assert.equal(held.safeHold, true);
  assert.equal(held.amount, "1000000");
  return `locked ${held.amount} units until ${held.releaseAfter}`;
});
control("deposit", "A Safe Hold may name the sender as approver (no family contact)", async () => {
  const f = await openSafeHold(await family({ approverIsSender: true }));
  const held = await hold.readHold(conn, f.state);
  assert.equal(held.approver, f.sender.publicKey.toBase58());
  return "opened; approver = sender";
});

// =============================================================================================
// Refund ("undo")
// =============================================================================================

const onSafeHold = (name, expected, build) => attack("refund", name, expected, async () => {
  const f = await openSafeHold(await family());
  return { attempt: () => build(f), watch: [f.vault, f.senderAta, attackerAtaA, f.state] };
});

onSafeHold("A stranger refunds the hold to themselves", ERR.WRONG_SENDER,
  (f) => submit([attacker], refundIx({ sender: attacker.publicKey, state: f.state, vault: f.vault, destination: attackerAtaA, mint: f.mint })));
onSafeHold("The approver refunds the hold", ERR.WRONG_SENDER,
  (f) => submit([f.approver], refundIx({ sender: f.approver.publicKey, state: f.state, vault: f.vault, destination: f.senderAta, mint: f.mint })));
onSafeHold("Refund redirected to the attacker's token account", ERR.WRONG_DESTINATION,
  (f) => submit([f.sender], refundIx({ sender: f.sender.publicKey, state: f.state, vault: f.vault, destination: attackerAtaA, mint: f.mint })));
onSafeHold("Refund with the wrong mint account", ERR.WRONG_MINT,
  (f) => submit([f.sender], refundIx({ sender: f.sender.publicKey, state: f.state, vault: f.vault, destination: f.senderAta, mint: mintB })));
onSafeHold("Refund in the sender's name without their signature", "signature",
  (f) => submit([], refundIx({ sender: f.sender.publicKey, senderSigns: false, state: f.state, vault: f.vault, destination: f.senderAta, mint: f.mint })));

attack("refund", "Forged hold owned by another program", "programId", async () => ({
  attempt: () => submit([fx.attacker], refundIx({ sender: fx.attacker.publicKey, state: fx.foreign, vault: fx.safe.vault, destination: fx.attackerAta, mint: fx.mint })),
  watch: [fx.safe.vault, fx.attackerAta],
}), { needs: ["fixtures"] });
attack("refund", "Forged hold at a fake address, pointing at a real vault", "seeds", async () => ({
  attempt: () => submit([fx.attacker], refundIx({ sender: fx.attacker.publicKey, state: fx.nonPda, vault: fx.safe.vault, destination: fx.attackerAta, mint: fx.mint })),
  watch: [fx.safe.vault, fx.attackerAta],
}), { needs: ["fixtures"] });

{
  let refunded;
  control("refund", "The sender takes it back alone, without the PIN", async () => {
    refunded = await openSafeHold(await family());
    const before = (await getAccount(conn, refunded.senderAta)).amount;
    await submit([refunded.sender], refundIx({ sender: refunded.sender.publicKey, state: refunded.state, vault: refunded.vault, destination: refunded.senderAta, mint: refunded.mint }));
    const back = (await getAccount(conn, refunded.senderAta)).amount - before;
    assert.equal(back, 1_000_000n);
    assert.equal(await conn.getAccountInfo(refunded.state), null, "the hold account is closed");
    return `sender got ${back} units back; hold closed`;
  });
  attack("refund", "Replay: refund the same hold again", "programId", async () => ({
    attempt: () => submit([refunded.sender], refundIx({ sender: refunded.sender.publicKey, state: refunded.state, vault: refunded.vault, destination: refunded.senderAta, mint: refunded.mint })),
    watch: [refunded.senderAta],
  }));
}

// =============================================================================================
// Ordinary hold: the approver releases with the PIN
// =============================================================================================

const onOrdinary = (name, expected, build) => attack("release", name, expected, async () => ({
  attempt: () => build(fx.ordinary),
  watch: [fx.ordinary.vault, fx.recipientAta, fx.attackerAta, fx.ordinary.state],
}), { needs: ["fixtures"] });
const ordinaryRelease = (h, overrides = {}) => releaseIx({
  sender: fx.sender.publicKey, approver: fx.approver.publicKey, state: h.state, vault: h.vault, destination: fx.recipientAta, mint: fx.mint, pin: h.pin, ...overrides,
});

onOrdinary("Wrong PIN", ERR.WRONG_PIN, (h) => submit([fx.approver], ordinaryRelease(h, { pin: h.pin === "000000" ? "000001" : "000000" })));
onOrdinary("Five-digit PIN", ERR.WRONG_PIN, (h) => submit([fx.approver], ordinaryRelease(h, { pin: h.pin.slice(0, 5) })));
onOrdinary("PIN with a letter in it", ERR.WRONG_PIN, (h) => submit([fx.approver], ordinaryRelease(h, { pin: "12345a" })));
onOrdinary("The recipient signs as the approver", ERR.WRONG_APPROVER,
  (h) => submit([fx.recipient], ordinaryRelease(h, { approver: fx.recipient.publicKey })));
onOrdinary("Release redirected to the attacker's token account", ERR.WRONG_DESTINATION,
  (h) => submit([fx.approver], ordinaryRelease(h, { destination: fx.attackerAta })));
onOrdinary("Release in another sender's name", ERR.WRONG_SENDER,
  (h) => submit([fx.approver], ordinaryRelease(h, { sender: fx.attacker.publicKey })));
onOrdinary("The sender skips the approver with CONFIRM", ERR.NOT_SAFE_HOLD,
  (h) => submit([fx.sender], confirmIx({ sender: fx.sender.publicKey, state: h.state, vault: h.vault, destination: fx.recipientAta, mint: fx.mint })));

control("release", "The approver releases an ordinary hold with the right PIN", async () => {
  const h = fx.ordinary;
  const before = (await getAccount(conn, fx.recipientAta)).amount;
  await submit([fx.approver], ordinaryRelease(h));
  const received = (await getAccount(conn, fx.recipientAta)).amount - before;
  assert.equal(received, BigInt(h.amount));
  return `recipient got ${received} units`;
}, { needs: ["fixtures"] });
onOrdinary("Replay: release the same hold again", "programId", (h) => submit([fx.approver], ordinaryRelease(h)));

// =============================================================================================
// Safe Hold: only the sender confirms, after the cooling-off
// =============================================================================================

attack("safe hold", "The approver releases a Safe Hold with the right PIN", ERR.SENDER_CONFIRMS, async () => {
  const f = await openSafeHold(await family());
  return {
    attempt: () => submit([f.approver], releaseIx({ sender: f.sender.publicKey, approver: f.approver.publicKey, state: f.state, vault: f.vault, destination: f.recipientAta, mint: f.mint, pin: PIN })),
    watch: [f.vault, f.recipientAta, f.state],
  };
});
attack("safe hold", "The sender confirms during the cooling-off", ERR.TOO_EARLY, async () => {
  const f = await openSafeHold(await family());
  return {
    attempt: () => submit([f.sender], confirmIx({ sender: f.sender.publicKey, state: f.state, vault: f.vault, destination: f.recipientAta, mint: f.mint })),
    watch: [f.vault, f.recipientAta, f.state],
  };
});
attack("safe hold", "The recipient confirms in the sender's place", ERR.WRONG_SENDER, async () => {
  const f = await openSafeHold(await family());
  return {
    attempt: () => submit([f.recipient], confirmIx({ sender: f.recipient.publicKey, state: f.state, vault: f.vault, destination: f.recipientAta, mint: f.mint })),
    watch: [f.vault, f.recipientAta, f.state],
  };
});

const safeConfirm = (overrides = {}) => confirmIx({
  sender: fx.sender.publicKey, state: fx.safe.state, vault: fx.safe.vault, destination: fx.recipientAta, mint: fx.mint, ...overrides,
});
const onExpiredSafe = (name, expected, build) => attack("safe hold", name, expected, async () => ({
  attempt: () => build(fx.safe),
  watch: [fx.safe.vault, fx.recipientAta, fx.attackerAta, fx.safe.state],
}), { needs: ["fixtures"] });

onExpiredSafe("After the wait, the sender-as-approver uses RELEASE with the PIN", ERR.SENDER_CONFIRMS,
  (h) => submit([fx.sender], releaseIx({ sender: fx.sender.publicKey, approver: fx.sender.publicKey, state: h.state, vault: h.vault, destination: fx.recipientAta, mint: fx.mint, pin: h.pin })));
onExpiredSafe("After the wait, a stranger confirms", ERR.WRONG_SENDER,
  () => submit([fx.attacker], safeConfirm({ sender: fx.attacker.publicKey, destination: fx.attackerAta })));
onExpiredSafe("Confirm in the sender's name without their signature", "signature", () => submit([], safeConfirm({ senderSigns: false })));
onExpiredSafe("Confirm with the instructions sysvar left out", "accountKeys", () => submit([fx.sender], safeConfirm({ omitSysvar: true })));
onExpiredSafe("Confirm with a fake account in place of the instructions sysvar", "argument",
  () => submit([fx.sender], safeConfirm({ sysvar: Keypair.generate().publicKey })));
onExpiredSafe("Confirm with extra instruction data", "instructionData", () => submit([fx.sender], safeConfirm({ extraData: true })));
onExpiredSafe("Confirmation redirected to the attacker's token account", ERR.WRONG_DESTINATION,
  () => submit([fx.sender], safeConfirm({ destination: fx.attackerAta })));
onExpiredSafe("Confirm with the wrong mint account", ERR.WRONG_MINT, () => submit([fx.sender], safeConfirm({ mint: mintB })));
onExpiredSafe("Pre-signed confirmation (durable nonce, signed under pressure, sent later)", ERR.PRESIGNED_RELEASE, async () => {
  const nonce = Keypair.generate();
  const rent = await conn.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH);
  await submit([nonce], SystemProgram.createNonceAccount({
    fromPubkey: feePayer.publicKey, noncePubkey: nonce.publicKey, authorizedPubkey: feePayer.publicKey, lamports: rent,
  }));
  const { nonce: value } = await conn.getNonce(nonce.publicKey, "confirmed");
  const tx = new Transaction().add(
    SystemProgram.nonceAdvance({ noncePubkey: nonce.publicKey, authorizedPubkey: feePayer.publicKey }),
    safeConfirm());
  tx.recentBlockhash = value;
  tx.feePayer = feePayer.publicKey;
  tx.sign(feePayer, fx.sender);
  return conn.sendRawTransaction(tx.serialize());
});

control("safe hold", "The sender confirms their own Safe Hold after the cooling-off", async () => {
  const before = (await getAccount(conn, fx.recipientAta)).amount;
  await submit([fx.sender], safeConfirm());
  const received = (await getAccount(conn, fx.recipientAta)).amount - before;
  assert.equal(received, BigInt(fx.safe.amount));
  assert.equal(await conn.getAccountInfo(fx.safe.state), null, "the hold account is closed");
  return `recipient got ${received} units; only the sender signed`;
}, { needs: ["fixtures"] });
onExpiredSafe("Replay: confirm the same Safe Hold again", "programId", () => submit([fx.sender], safeConfirm()));

// =============================================================================================
// End to end with the review server's key (optional)
// =============================================================================================

control("end to end", "Server co-signs an ordinary hold; the approver releases it with the PIN", async () => {
  const f = await family();
  await submit([f.sender, POLICY], depositIx(f, { holdSeconds: 0, policy: POLICY.publicKey }));
  const before = (await getAccount(conn, f.recipientAta)).amount;
  await submit([f.approver], releaseIx({ sender: f.sender.publicKey, approver: f.approver.publicKey, state: f.state, vault: f.vault, destination: f.recipientAta, mint: f.mint, pin: PIN }));
  return `recipient got ${(await getAccount(conn, f.recipientAta)).amount - before} units`;
}, { needs: ["policy"] });
control("end to end", "A 3-second Safe Hold: early confirm refused, then the sender confirms", async () => {
  const f = await openSafeHold(await family(), { holdSeconds: 3 });
  const confirmNow = () => submit([f.sender], confirmIx({ sender: f.sender.publicKey, state: f.state, vault: f.vault, destination: f.recipientAta, mint: f.mint }));
  await hold.expectFail(confirmNow(), ERR.TOO_EARLY);
  const { releaseAfterUnix } = await hold.readHold(conn, f.state);
  while ((await hold.chainTime(conn)) <= releaseAfterUnix) await new Promise((resolve) => setTimeout(resolve, 1000));
  await confirmNow();
  return `refused at first (TOO_EARLY), then paid ${(await getAccount(conn, f.recipientAta)).amount} units`;
}, { needs: ["policy"] });
