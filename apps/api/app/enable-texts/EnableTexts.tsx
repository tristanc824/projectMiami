'use client';

// TEMPORARY: a one-time approval page for text payments, until the Nest iPhone build can do it.
// Not linked from the website. Delete this folder once the app handles it.
import { PrivyProvider, useLoginWithSms, usePrivy, useSigners } from '@privy-io/react-auth';
import { useState } from 'react';

type Settings = { available: boolean; on: boolean; number: string; signerId: string; policyId: string };

function Enable() {
  const { ready, authenticated, user, getAccessToken, logout } = usePrivy();
  const { sendCode, loginWithCode } = useLoginWithSms();
  const { addSigners } = useSigners();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (work: () => Promise<void>) => {
    setBusy(true); setStatus('');
    try { await work(); } catch (err) { setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`); }
    finally { setBusy(false); }
  };
  const api = async (method: 'GET' | 'POST', body?: unknown) => {
    const res = await fetch('/api/text-payments', {
      method, cache: 'no-store',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${await getAccessToken()}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data;
  };

  if (!ready) return <p>Loading…</p>;
  if (!authenticated) return (
    <>
      <input placeholder="Your phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
      {codeSent && <input placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />}
      <button className="primary" disabled={busy} onClick={() => run(async () => {
        if (!codeSent) { await sendCode({ phoneNumber: phone }); setCodeSent(true); }
        else await loginWithCode({ code });
      })}>{codeSent ? 'Log in' : 'Text me a code'}</button>
      {status && <p className="error">{status}</p>}
    </>
  );

  const wallet = user?.linkedAccounts.find((a) => a.type === 'wallet' && 'chainType' in a && a.chainType === 'solana' && a.walletClientType === 'privy');
  const address = wallet && 'address' in wallet ? wallet.address : '';
  return (
    <>
      <p>Logged in as {user?.phone?.number}. Wallet {address ? `${address.slice(0, 4)}…${address.slice(-4)}` : 'not found'}.</p>
      <input inputMode="numeric" type="password" maxLength={4} placeholder="Choose a 4-digit PIN" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
      <button className="primary" disabled={busy || pin.length !== 4 || !address} onClick={() => run(async () => {
        const s: Settings = await api('GET');
        if (!s.available) throw new Error('Text payments are not set up on the server.');
        try {
          await addSigners({ address, signers: [{ signerId: s.signerId, policyIds: [s.policyId] }] });
        } catch (err) {
          if (!(err instanceof Error && /already/i.test(err.message))) throw err;
        }
        await api('POST', { on: true, pin });
        setPin('');
        setStatus(`Done. Text payments are on. Text BAL and your PIN to ${s.number} to try it.`);
      })}>{busy ? 'Turning on…' : 'Turn on text payments'}</button>
      {status && <p className={status.startsWith('Error') ? 'error' : 'note'}>{status}</p>}
      <button className="link" onClick={() => logout()}>Log out</button>
    </>
  );
}

export default function EnableTexts() {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
      config={{ loginMethods: ['sms'], intl: { defaultCountry: 'US' }, appearance: { walletChainType: 'solana-only' }, embeddedWallets: { showWalletUIs: false, solana: { createOnLogin: 'all-users' } } }}
    >
      <main className="login">
        <h1>Turn on text payments</h1>
        <p className="muted">Temporary page. Test USDC on Solana devnet only.</p>
        <div className="card"><Enable /></div>
      </main>
    </PrivyProvider>
  );
}
