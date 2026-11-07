/** Connectivity probe only; it does not access wallets, credentials, or payment services. */
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ status: 'ok', service: 'guard-api' }, { headers: { 'cache-control': 'no-store' } });
}
