# Nest

SharkByte hackathon project. **Nest**: a dollar account for anyone with a phone, on Solana. *Protect what matters.* The mobile app now follows the Nest mockups and website. See APP_HANDOFF.md.

## Run the iPhone / web preview

The app is in [`apps/mobile`](./apps/mobile/README.md), built with React Native / Expo. It uses clearly labeled local demo funds. For the iPhone, open it in Expo Go; native Auth0 login and TestFlight use a development/store build.

```sh
cd apps/mobile
npm install
npm start
```

Use `npm run web` in the same directory for the shared web app.

The backend is in [`apps/api`](./apps/api/HANDOFF.md): a Next.js app (DAT) with Privy SMS login, self-custody Solana wallets, sponsored devnet USDC transfers, and Stripe test-mode deposits. A development build can use it for real devnet money; see "Live mode" in the mobile README. Secrets go in `apps/api/.env.local` and are never committed. See the mobile README for Auth0, signing, EAS, and TestFlight instructions.

- [DESIGN.md](./DESIGN.md) — Current Nest app design system, screen map, and implementation limits.

**Start here if you're building the app:** [APP_HANDOFF.md](./APP_HANDOFF.md). It has the brand, features, copy rules and the 16 app screens ([`app-design/nest-app-screens.html`](./app-design/nest-app-screens.html), open in a browser).

- [PITCH_PLAYBOOK.md](./PITCH_PLAYBOOK.md) — the angle, selling points, 3-minute table script, 30-second opener, Q&A prep and 90-second demo video. Fill in section 0 before the first judge.
- [`web-earth/`](./web-earth) — the website. `npm install && npm run dev` → http://localhost:5175
- [TEAM_PROMPTS.md](./TEAM_PROMPTS.md) — what to build, which questions are still open, and the prompts to paste into Cursor or Claude.
- [HACKATHON_CONTEXT.md](./HACKATHON_CONTEXT.md) — research, sources, and the planning record. Read this before changing product direction.
- [PITCH_RESEARCH.md](./PITCH_RESEARCH.md) — real problems with sources, the judging angle, winning projects, and the live demo and video plan.
- [ECONOMIC_PROBLEMS.md](./ECONOMIC_PROBLEMS.md) — the 12 global money problems Nest solves, with sources, and which three to lead the pitch with.
- [INSTITUTIONS_RESEARCH.md](./INSTITUTIONS_RESEARCH.md) — problems for banks, governments, aid agencies and businesses, the "Nest for Institutions" product map, and market size.
- [BLOCKCHAIN_STACK.md](./BLOCKCHAIN_STACK.md) — the Solana stack to build with (verified Nov 7), the architecture, devnet pitfalls, and the integrations that impress judges.
- [UI_INSPIRATION.md](./UI_INSPIRATION.md) — lessons from Zander Whitehurst's 30 most-viewed UI reels.
- [NEST_FEATURES.md](./NEST_FEATURES.md) — which features to build, the prize stack, the "massive potential" vision, and the app UI direction.

## Website and browser sending

Run `npm run website` from the repository root. This starts the API on port 5184 if needed, exports the connected web app, and opens the website server on port 5175. Visit **http://localhost:5175**, then choose **Log in** or **Open an account**. Nest opens at `/app/sign-in` and uses the same Privy phone account and Solana devnet wallet as the native app. Transfers require a review and wallet signature.

The website proxies `/api` to the local API, so browser transfers do not depend on a hardcoded LAN address or cross-origin permissions. Browser wallets require localhost or HTTPS; an HTTP LAN IP on an iPhone is not a secure browser-wallet origin.

The build reads the public Privy app ID from `apps/api/.env.local` (falling back to the mobile public ID) and checks it matches mobile. Backend secrets remain in the API. After changing app screens, run `npm run build:web-app` and reload the website. Marketing changes still hot reload. `npm run build:website` builds both parts; `npm run website:preview` previews that build with the local API proxy.

`npm run test:website` runs isolated browser login, signing, payment, failure, and request-link tests with mock authentication and mocked API responses. Its export is separate from the real website, and its fake token is never accepted by the real API. Real SMS verification and a user-approved devnet transfer still need a manual account check. Balances are shared through the wallet; activity and contact names remain local to each browser/device. Apple Cash and bank delivery remain simulated.

## External code and assets

See [EXTERNAL_CODE.md](EXTERNAL_CODE.md) for the libraries, services, assets and AI tools Nest uses, and what the team built itself.
