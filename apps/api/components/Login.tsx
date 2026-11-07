'use client';

import { useState } from 'react';
import { normalizePhone } from '@/lib/phone.mjs';

type Props = {
  sendCode: (phone: string) => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
};

export default function Login({ sendCode, verifyCode }: Props) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <div className="login-mark">DAT</div>
      <h1>Dollars you hold yourself.</h1>
      <p className="login-sub">Save in digital dollars and send them to any phone number, in seconds.</p>

      {step === 'phone' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const normalized = normalizePhone(phone);
            if (!normalized) return setError('Enter your full phone number');
            run(async () => {
              await sendCode(normalized);
              setStep('code');
            });
          }}
        >
          <label htmlFor="phone">Your phone number</label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(555) 555-0142"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button className="primary" disabled={busy}>
            {busy ? 'Sending…' : 'Text me a code'}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => verifyCode(code.trim()));
          }}
        >
          <label htmlFor="code">Enter the 6-digit code</label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className="primary" disabled={busy}>
            {busy ? 'Checking…' : 'Continue'}
          </button>
          <button
            type="button"
            className="link"
            onClick={() => {
              setCode('');
              setError('');
              setStep('phone');
            }}
          >
            Use a different number
          </button>
        </form>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <p className="fine">No seed phrase and nothing to install. Test network: no real money moves.</p>
    </main>
  );
}
