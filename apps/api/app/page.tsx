'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Privy and Stripe need the browser, so the live app never renders on the server.
const LiveApp = dynamic(() => import('@/components/LiveApp'), { ssr: false });

export default function Page() {
  const [secureContext, setSecureContext] = useState<boolean | null>(null);
  useEffect(() => { setSecureContext(window.isSecureContext); }, []);

  if (secureContext === null) return <div className="splash">Guard</div>;
  if (!secureContext) return <main className="login">
    <div className="login-mark">Guard</div>
    <h1>Server connected.</h1>
    <p className="login-sub">Your phone can reach the Guard server on this Mac.</p>
    <div className="card">
      <h2>Continue in the Guard app</h2>
      <p>The browser wallet requires HTTPS. Use the installed Guard app to sign in and send test USDC, or open the web app at an HTTPS address.</p>
      <a className="primary center" href="/api/health">Check server connection</a>
    </div>
  </main>;
  return <LiveApp />;
}
