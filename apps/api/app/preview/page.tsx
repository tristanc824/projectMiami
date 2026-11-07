'use client';

import { notFound } from 'next/navigation';
import { useMemo, useState } from 'react';
import Home from '@/components/Home';
import Login from '@/components/Login';
import type { Activity, Session } from '@/components/types';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const FAKE_SIG = '64WgSctMnVFsegVX6BsLpDSoBoLoPva6PcCyLQD6cD9kjkmPAnzxv7j7bTddFACM7JVN1YLhuZpJnM9ZNaQTyjCh';

// Development-only view of the screens with fake data and no login.
export default function Preview() {
  if (process.env.NODE_ENV === 'production') notFound();
  const [balance, setBalance] = useState(0);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [screen, setScreen] = useState<'home' | 'login'>('home');
  const add = (a: Omit<Activity, 'id' | 'at'>) =>
    setActivity((list) => [{ ...a, id: String(Date.now()), at: Date.now() }, ...list]);

  const session = useMemo<Session>(
    () => ({
      phone: '+15555550142',
      address: '8cCzCydLeRNZvGsYp2PZW8r5yQRNzofanjnAcuR8kZGy',
      balance,
      activity,
      received: null,
      knownRecipient: () => false,
      findRecipient: async (phone) => {
        await wait(400);
        return { phone, address: '77m7HCt9N6VBCRiJi3WUUeL2QFbMtKmt9mdv6KbyYCCb', invited: phone.endsWith('0') };
      },
      send: async (r, amount) => {
        await wait(900);
        setBalance((b) => b - amount);
        add({ kind: 'sent', label: r.phone, amount: -amount, signature: FAKE_SIG });
        return FAKE_SIG;
      },
      toTreasury: async (kind, label, amount) => {
        await wait(900);
        setBalance((b) => b - amount);
        add({ kind, label, amount: -amount, signature: FAKE_SIG });
        return FAKE_SIG;
      },
      depositTestCard: async (amount) => {
        await wait(900);
        setBalance((b) => b + amount);
        add({ kind: 'deposit', label: 'Added with test card', amount, signature: FAKE_SIG });
        return FAKE_SIG;
      },
      depositIntent: async () => ({ id: 'preview', clientSecret: '' }),
      depositComplete: async () => FAKE_SIG,
      logout: async () => setScreen('login'),
    }),
    [balance, activity],
  );

  if (screen === 'login') {
    return (
      <Login
        sendCode={async () => wait(400)}
        verifyCode={async () => {
          await wait(400);
          setScreen('home');
        }}
      />
    );
  }
  return <Home session={session} applePay={false} />;
}
