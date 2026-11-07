'use client';

import dynamic from 'next/dynamic';

// Privy and Stripe need the browser, so the live app never renders on the server.
const LiveApp = dynamic(() => import('@/components/LiveApp'), { ssr: false });

export default function Page() {
  return <LiveApp />;
}
