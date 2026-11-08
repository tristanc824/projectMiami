# External code, tools and assets

SharkByte rule 3 asks teams to document outside code and tell judges what is theirs. Everything below was used, not written, by the Nest team. All Nest code in this repository was written during the hacking period (the first commit is Nov 6, 2026, 9:15 PM ET).

## What the team built
- The Nest mobile and web app screens, navigation, wallet state and activity history (`apps/mobile`).
- The Nest backend: balances, phone-number sends, recipients, history, Stripe test deposits and text payments over SMS (`apps/api`).
- The scam review agents' prompts, scoring and red-team scenarios, built on the Swarms API.
- The Safe Hold Solana program that holds a flagged transfer for 24 hours.
- The marketing website (`web-earth`), the demo film's motion graphics (`video`), and the pitch materials (`pitch`).

## Open-source libraries and frameworks
- **App:** React Native, Expo SDK 58 and Expo Router, React, TypeScript, Ionicons (via @expo/vector-icons).
- **Backend:** Next.js, Node.js.
- **Website:** React, Vite, Tailwind CSS.
- **Solana:** @solana/web3.js, @solana/kit, @solana/spl-token, @solana-program/token, @solana-program/system, @solana-program/memo. The Safe Hold program uses standard Solana Rust crates.
- **Film:** Remotion.
- **Font:** Figtree (SIL Open Font License).

## Services and APIs
- **Privy:** phone sign-in and self-custody Solana wallets (@privy-io/expo, @privy-io/react-auth).
- **Solana devnet** and Circle's devnet USDC.
- **Stripe** in test mode (stripe, @stripe/stripe-js, @stripe/react-stripe-js) for "Add money".
- **httpSMS:** an open-source Android SMS gateway app that forwards texts to our server.
- **Swarms API:** runs the scam review agents.

## Assets and AI tools
- **Photos:** Unsplash (free license), on the website and the sign-in screen.
- **Illustrations:** the Devpost gallery, guide cards and thumbnails were generated with Higgsfield (GPT Image), then laid out by the team.
- **Narration:** an AI voice from ElevenLabs, generated through Higgsfield.
- **Demo film music:** "Best Friend" by SOFI TUKKER. It is used for the hackathon demo only and is not licensed for redistribution.
- **AI coding assistants:** Claude (Anthropic) and Cursor were used while writing code and copy.
- **Data:** inflation figures are from Argentina's INDEC consumer price index (2023).
