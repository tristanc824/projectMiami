# Public payment links — November 8, 2026

Public website: https://nestbank.us/

App/payment-link base: https://nestbank.us/app

Configured `EXPO_PUBLIC_PAYMENT_URL` in the ignored mobile environment and `NEST_WEBSITE_URL` in the ignored API environment. The served native bundle contains the public payment base.

Verified HTTPS landing page, `/app`, `/app/pay` and `/api/health` return successfully. An isolated browser opened a fictional $1 devnet request with its recipient/note displayed. The sign-in handoff preserves the request; no SMS code or payment was sent. The unauthenticated transfer preparation endpoint returns 401. Actual authenticated payment completion still requires the payer to sign in and approve.
