function websiteUrl() {
  try {
    const url = new URL(process.env.NEST_WEBSITE_URL || 'http://localhost:5175');
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid URL');
    return url.origin;
  } catch { return 'http://localhost:5175'; }
}
export default function Page() {
  return <main style={{ maxWidth: 620, margin: '12vh auto', padding: 28 }}>
    <p>Nest API · Solana devnet</p>
    <h1>Start with Nest.</h1>
    <p>This server powers sign-in, balances and test payments. Open the Nest website to use the app.</p>
    <p><a href={`${websiteUrl()}/app/sign-in`}>Open Nest</a></p>
    <p><a href="/api/health">Check API health</a></p>
    <p>Test USDC only. No real money or bank payouts.</p>
  </main>;
}
