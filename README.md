# Guard

**Protect what matters.** SharkByte hackathon project. Solana-native family money app.

## Run the iPhone / web preview

The app is in [`apps/mobile`](./apps/mobile/README.md), built with React Native / Expo. It uses clearly labeled local demo funds. For the iPhone, open it in Expo Go; native Auth0 login and TestFlight use a development/store build.

```sh
cd apps/mobile
npm install
npm start
```

Use `npm run web` in the same directory for the shared web app.

The backend is in [`apps/api`](./apps/api/HANDOFF.md): a Next.js app (DAT) with Privy SMS login, self-custody Solana wallets, sponsored devnet USDC transfers, and Stripe test-mode deposits. A Guard development build can use it for real devnet money; see "Live mode" in the mobile README. Secrets go in `apps/api/.env.local` and are never committed. See the mobile README for Auth0, signing, EAS, and TestFlight instructions.

- [DESIGN.md](./DESIGN.md) — Cash App / PayPal reference research and the Guard design system.

## Voice review demo

The local demo lets a person speak or type a proposed transfer, keeps only safe
amount and relationship facts, and runs the `PlainSpeaker -> Skeptic -> Judge`
Swarms review. It can read the bilingual summary aloud. It cannot sign or send
funds, and the local fiat payout remains a labeled simulation.

The language selector includes 47 locales across South America and the
Caribbean, Africa and the Middle East, South Asia, and Southeast/Central Asia.
The selected locale controls microphone recognition, the Swarms translation,
and read-aloud. Browser speech and voice availability varies by locale, so the
typed command and translated text remain available as fallbacks.

```powershell
$env:SWARMS_API_KEY = "your-key"
python app.py
```

Open <http://127.0.0.1:8000>. If the browser does not expose speech recognition,
the typed-command fallback remains available.

Voice examples:

- `Prepare an 80 dollar transfer. The relative is not verified.`
- `Send 95 dollars. The relationship is verified.`
- `Read the summary.`
- `Clear.`

The command-line swarm remains available:

```powershell
python swarm/family_review.py --dry-run
python swarm/family_review.py
```

## Family hold (devnet test token)

`programs/family_hold` locks test USDC until the approver releases it. The
sender can refund alone. Release needs the approver's signature and the 6-digit
PIN: the PIN hash is public on-chain, so the signature is the real check.

```powershell
node hold/hold.mjs demo            # lock, check the refusals, refund, lock, release
node hold/hold.mjs lock 80         # lock 80 test USDC and print the PIN
node hold/hold.mjs refund          # the sender cancels
node hold/hold.mjs release 123456  # the approver releases to the recipient
python swarm/open_hold.py --note "..." --deposit  # Prune, swarm, then lock the reviewed amount
```

Release takes the accounts `fee_payer, sender, approver (signer), state, vault,
recipient_token, mint, token_program`. Rebuild and redeploy the program after
changing it. Keys live in `hold/keys/`, which Git ignores.

The voice server accepts only same-origin JSON posts on a loopback host, so
another website cannot spend the Swarms credits behind `SWARMS_API_KEY`.

- [TEAM_PROMPTS.md](./TEAM_PROMPTS.md) — what to build, which questions are still open, and the prompts to paste into Cursor or Claude.
- [HACKATHON_CONTEXT.md](./HACKATHON_CONTEXT.md) — research, sources, and the planning record. Read this before changing product direction.
