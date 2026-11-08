# Is Nest the only app that sends money with no Wi-Fi or data?

Researched 2026-11-07. Short answer: **no.**

## Who already does it

**USSD / SMS mobile money (huge, live, feature phones):**
- **M-Pesa (Safaricom, Kenya):** *334# menu, PIN, SMS receipt; since Sept 2020 [1][2].
- **MTN MoMo:** USSD (*170# in Ghana; code varies by country) [3].
- **Airtel Money:** *185# (Uganda; third-party sources only) [4].
- **India *99# (NPCI NUUP):** USSD banking on any GSM phone, no data [5].
- **UPI 123PAY (NPCI, March 2022):** feature-phone UPI by IVR call, missed call, OEM app, or sound [6][7].
- **US "text banking"** (many banks and credit unions): mostly transfers between your own accounts by SMS, not P2P [8].

**Phone-to-phone with no network at all:**
- **UPI Lite X (NPCI, 2023):** offline NFC tap between phones, small amounts [9].
- **e-CNY "dual offline":** hardware-wallet cards and NFC phones, both sides offline (pilots since 2021) [10].
- **RBI offline e-rupee:** announced Feb 2024. Reported launched Oct 2025 with telecom-assisted and NFC modes [11].
- **Digital euro:** offline device-to-device mode is designed but not issued yet. The ECB signed an offline-solution framework in Oct 2025, and the legislation is still pending [12][13].

**Consumer wallets: limited or no offline support.**
- **Cash App:** no offline sending. It needs a connection, and I found no official offline mode [14].
- **Venmo / PayPal:** online only (no offline P2P found; no official statement either).
- **Google Wallet:** a few cached tokens let you tap to pay at a store briefly offline. Not P2P [15].
- **Apple Pay:** Express Mode / power reserve covers transit and keys only. Not P2P [16].

**Crypto and stablecoins without data:**
- **Kotani Pay (Kenya):** USSD access to stablecoins (cUSD; reportedly USDC/USDT). $2M pre-seed in 2023 [17].
- **Machankura:** Bitcoin Lightning over USSD in several African countries, custodial [18].
- **Mandla Money (XRPL):** SMS/USSD/WhatsApp wallet, custodial, balances off-chain, Twilio gateway [19][20].
- **Xelio (Circle partner, Solana, USDC/EURC):** claims SMS stablecoin sends "even without internet" on feature phones [21]. **This is the closest same-chain, same-token competitor.**
- **CellFi, ETHGlobal Taipei 2025 finalist:** send, receive and check USDC by SMS [22].
- **CellFi, ETHOnline 2025:** the app signs the transaction offline, sends it by SMS to a backend, and the backend broadcasts it. Ethereum Sepolia testnet [23]. **This is architecturally the same as Nest.**
- **Bitchat + Cashu (2025):** ecash over a Bluetooth mesh; the recipient redeems at a mint later [24].
- **goTenna TxTenna + Blockstream Satellite (2019):** signed BTC over a mesh radio [25].
- **Locha Mesh (Venezuela):** radio mesh for signed BTC transactions; stalled [26].

**Solana building blocks:** Solana's docs describe durable nonces as the tool for offline signing and delayed submission. The docs warn durable nonces "may be deprecated" [27]. I found no live Solana product doing SMS-relayed, self-signed USDC.

## (1) Is Nest "the only one"?

No. Hundreds of millions send money without data daily via M-Pesa, MoMo, Airtel Money, *99# and UPI 123PAY. Kotani Pay and Xelio already do stablecoins without data. CellFi (ETHOnline 2025) already showed a similar pattern (sign on phone, relay by SMS, broadcast) on an Ethereum testnet.

## (2) What is genuinely distinctive

The combination is what's distinctive. None of the parts is new on its own.

> **Updated Nov 8 from the code on `main`.** Text payments are built and tested on devnet. You text Nest's number a command with your PIN (for example `SEND 5 <number> PIN ••••`). Nest's server then sends from your own Privy wallet using a limited signer you turned on once in the app. The payment is **not** signed on the phone, so don't claim that. The per-payment and daily limits are a setting the team chose; don't bring them up.

1. **The money sits in the user's own wallet.** The money stays in the user's own Privy wallet. The texting route is a limited permission that the user turns on and can switch off by texting STOP.
2. **Real on-chain USDC on Solana.** Compare CellFi: Ethereum testnet. Mandla: off-chain ledger.
3. **Built for cross-border family remittance, with a scam check and undo.**
4. **Works from any phone with a signal once it's turned on.** The app is needed only for the one-time setup.

Honest limits:
- **Setup needs the app once.** After that, texting works without data.
- **"Undo" is the on-chain Safe Hold** (24 h for flagged payments). A released USDC transfer cannot be reversed.
- **"Right away" assumes the SMS gateway is online.**
- **Mainnet:** only claim it if Nest is actually on mainnet.

## (3) What to say at the judging table

**Safe claim:** "Even without Wi-Fi or data, you can send money by texting Nest, so your money is never stuck. And there's a scam check before it goes out."

**Do NOT say:**
1. "We're the first or only way to send money without internet." M-Pesa, UPI 123PAY, Kotani Pay, Xelio and CellFi all predate Nest.
2. "Payments are instant and can always be undone," or "works with zero signal." Nest needs cell signal and a live gateway, and a released transfer is final.
3. "It's signed on your phone." Text payments are sent by Nest's server with the limited permission you gave it.

## Sources (fetched or searched 2026-11-07)
1. https://safaricom.co.ke/main-mpesa/m-pesa-services/transactions/tuma-popote
2. https://hapakenya.com/2020/09/10/safaricom-customers-with-feature-phones-can-now-access-m-pesa-on-ussd-via-334
3. https://help-center.mtn.com.gh/hc/en-us/articles/5229783406354-How-do-I-send-money-to-another-MTN-MoMo-user
4. https://www.dignited.com/21824/send-mobile-money-directly-mtn-users-to-airtel-money/
5. https://www.idbi.bank.in/idbi-bank-mobile-banking-ussd.aspx
6. https://www.npci.org.in/what-we-do/upi-123pay/product-overview (returned 503 when fetched)
7. https://inc42.com/buzz/explained-how-upi123pay-will-work-on-feature-phones
8. https://gatecity.bank/education/help/mobile-services/text-banking/can-i-transfer-funds-using-my-phone/
9. https://www.npci.org.in/what-we-do/upi-lite/upi-lite-x/product-overview (page renders client-side)
10. https://cointelegraph.com/news/hardware-wallet-for-digital-yuan-debuts-in-xiong-an-new-area
11. https://www.business-standard.com/finance/news/rbi-to-introduce-offline-digital-rupee-transactions-soon-governor-das-124020800381_1.html and https://www.angelone.in/news/personal-finance/rbi-launches-offline-digital-rupee-with-15-banks-including-sbi-icici-and-hdfc
12. https://www.ecb.europa.eu/press/pr/date/2024/html/ecb.pr240624~7b3d7581e6.en.html
13. https://www.nexigroup.com/en/media-relations/news/2025/10/ecb-digital-euro/
14. https://community.squareup.com/t5/Square-Register/Cash-App-in-offline-mode/td-p/749741
15. https://9to5google.com/2023/12/20/google-wallet-without-internet/
16. https://support.apple.com/en-ae/105123
17. https://thecondia.com/kotani-pay-raises-pre-seed/
18. https://decrypt.co/123641/machankura-african-bitcoin-adoption-feature-phones-text
19. https://mandla-money.github.io/mandla-money-web/faq/
20. https://mandla-money.github.io/wallet/general.html
21. https://partners.circle.com/partner/xelio (page updated 2025-08-13)
22. https://ethglobal.com/showcase/cellfi-ctrmp
23. https://ethglobal.com/showcase/cellfi-bqqmn
24. https://www.bankless.com/read/taking-chat-and-payments-offline
25. https://gotenna.com/blogs/newsroom/blockstream-satellite-and-gotenna-collaborate-to-make-sending-bitcoin-without-internet-possible
26. https://cointelegraph.com/news/venezuelan-team-working-on-bitcoin-mesh-network-based-on-offline-radios
27. https://solana.com/docs/core/transactions/durable-nonces
