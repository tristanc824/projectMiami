/**
 * Test accounts for the on-chain attack tests, loaded into solana-test-validator at start-up.
 *
 * Some attacks need a Safe Hold whose 24-hour cooling-off is already over, or an ordinary hold.
 * Opening those for real needs the policy authority's private key, which is never committed.
 * Instead this writes the hold accounts exactly as the program would have stored them, and the
 * validator loads them with --account. The program cannot tell them apart from real deposits, so
 * every check after the deposit runs against them as it would on devnet.
 *
 * It also writes two forged holds an attacker might try: one owned by another program, and one
 * owned by this program at an address that is not the hold's PDA (pointing at a real vault).
 *
 *   ARGS=$(node hold/attack-fixtures.mjs <dir>)      # prints the --account arguments
 *   solana-test-validator --bpf-program <id> family_hold.so $ARGS
 *
 * Every key here is generated fresh on each run and lives only in <dir>.
 */
import { Keypair, PublicKey } from "@solana/web3.js";
import { ACCOUNT_SIZE, AccountLayout, MINT_SIZE, MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { PROGRAM_ID, pinHash, statePda, vaultPda } from "./hold.mjs";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: node hold/attack-fixtures.mjs <output dir>");
  process.exit(1);
}
mkdirSync(dir, { recursive: true });

// State layout from programs/family_hold/src/lib.rs.
const STATE_SIZE = 243;
const LAMPORTS = 5_000_000; // comfortably rent-exempt for every account written here
const REVIEW_HASH = createHash("sha256").update("attack fixture review").digest();

const sender = Keypair.generate();
const approver = Keypair.generate();
const recipient = Keypair.generate();
const attacker = Keypair.generate();
const mint = Keypair.generate().publicKey;
const mintAuthority = Keypair.generate();

const accounts = [];
function account(address, owner, data) {
  const file = join(dir, `${address.toBase58()}.json`);
  writeFileSync(file, JSON.stringify({
    pubkey: address.toBase58(),
    account: {
      lamports: LAMPORTS,
      data: [Buffer.from(data).toString("base64"), "base64"],
      owner: owner.toBase58(),
      executable: false,
      rentEpoch: 0,
      space: data.length,
    },
  }));
  accounts.push([address.toBase58(), file]);
}

function stateData({ holdSender, holdApprover, holdRecipient, vault, vaultBump, amount, pin, releaseAfter, flags }) {
  const data = Buffer.alloc(STATE_SIZE);
  data[0] = 1;
  holdSender.toBuffer().copy(data, 1);
  holdApprover.toBuffer().copy(data, 33);
  holdRecipient.toBuffer().copy(data, 65);
  mint.toBuffer().copy(data, 97);
  vault.toBuffer().copy(data, 129);
  data.writeBigUInt64LE(amount, 161);
  data[169] = vaultBump;
  pinHash(pin).copy(data, 170);
  data.writeBigInt64LE(releaseAfter, 202);
  REVIEW_HASH.copy(data, 210);
  data[242] = flags;
  return data;
}

function tokenAccount(owner, amount) {
  const data = Buffer.alloc(ACCOUNT_SIZE);
  AccountLayout.encode({
    mint, owner, amount, delegateOption: 0, delegate: PublicKey.default, state: 1,
    isNativeOption: 0, isNative: 0n, delegatedAmount: 0n, closeAuthorityOption: 0, closeAuthority: PublicKey.default,
  }, data);
  return data;
}

// A hold as the program's deposit would have left it: the state at its PDA and a funded vault.
function hold({ holdApprover, amount, pin, releaseAfter, flags }) {
  const [state] = statePda(sender.publicKey, holdApprover, recipient.publicKey, mint);
  const [vault, vaultBump] = vaultPda(state);
  account(state, PROGRAM_ID, stateData({
    holdSender: sender.publicKey, holdApprover, holdRecipient: recipient.publicKey, vault, vaultBump, amount, pin, releaseAfter, flags,
  }));
  account(vault, TOKEN_PROGRAM_ID, tokenAccount(vault, amount));
  return { state: state.toBase58(), vault: vault.toBase58(), vaultBump, amount: amount.toString(), pin };
}

const holds = {
  // Flagged and past its cooling-off. The sender is also named as approver: no family contact.
  expiredSafe: hold({ holdApprover: sender.publicKey, amount: 3_000_000n, pin: "123456", releaseAfter: 1n, flags: 1 }),
  // An ordinary hold: released by the approver with the PIN.
  ordinary: hold({ holdApprover: approver.publicKey, amount: 2_000_000n, pin: "654321", releaseAfter: 0n, flags: 0 }),
};

// Forged: claims to be a hold paying the attacker, but owned by the token program.
const foreign = Keypair.generate().publicKey;
const realVault = new PublicKey(holds.expiredSafe.vault);
account(foreign, TOKEN_PROGRAM_ID, stateData({
  holdSender: attacker.publicKey, holdApprover: attacker.publicKey, holdRecipient: attacker.publicKey,
  vault: realVault, vaultBump: holds.expiredSafe.vaultBump, amount: 3_000_000n, pin: "000000", releaseAfter: 1n, flags: 1,
}));
// Forged: owned by this program at a non-PDA address, pointing at the expired Safe Hold's real vault.
const nonPda = Keypair.generate().publicKey;
account(nonPda, PROGRAM_ID, stateData({
  holdSender: attacker.publicKey, holdApprover: attacker.publicKey, holdRecipient: attacker.publicKey,
  vault: realVault, vaultBump: holds.expiredSafe.vaultBump, amount: 3_000_000n, pin: "000000", releaseAfter: 1n, flags: 1,
}));

const mintData = Buffer.alloc(MINT_SIZE);
MintLayout.encode({
  mintAuthorityOption: 1, mintAuthority: mintAuthority.publicKey, supply: 5_000_000n, decimals: 6,
  isInitialized: true, freezeAuthorityOption: 0, freezeAuthority: PublicKey.default,
}, mintData);
account(mint, TOKEN_PROGRAM_ID, mintData);

const secret = (keypair) => Array.from(keypair.secretKey);
writeFileSync(join(dir, "fixtures.json"), JSON.stringify({
  mint: mint.toBase58(),
  mintAuthority: secret(mintAuthority),
  sender: secret(sender),
  approver: secret(approver),
  recipient: secret(recipient),
  attacker: secret(attacker),
  holds,
  forged: { foreignOwner: foreign.toBase58(), nonPda: nonPda.toBase58() },
}, null, 2));

console.log(accounts.map(([address, file]) => `--account ${address} ${file}`).join(" "));
