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

- [TEAM_PROMPTS.md](./TEAM_PROMPTS.md) — what to build, which questions are still open, and the prompts to paste into Cursor or Claude.
- [HACKATHON_CONTEXT.md](./HACKATHON_CONTEXT.md) — research, sources, and the planning record. Read this before changing product direction.
