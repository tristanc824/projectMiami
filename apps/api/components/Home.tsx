'use client';

import { useEffect, useState } from 'react';
import { formatUsd } from '@/lib/money.mjs';
import { formatPhone } from '@/lib/phone.mjs';
import AddMoney from './AddMoney';
import HedgeChart from './HedgeChart';
import { explorerAddress, explorerTx, type Activity, type Recipient, type Session } from './types';

type Sheet = 'add' | 'send' | 'cashout' | 'card' | null;
const DEPOSITS = [5, 10, 20];
const MERCHANT = { name: 'Corner Coffee', amount: 4.5 };

const parseAmount = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && /^\d*(\.\d{0,2})?$/.test(value.trim()) ? n : null;
};
const message = (err: unknown) => (err instanceof Error && err.message ? err.message : 'Something went wrong');

function SheetFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button className="close" aria-label="Close" onClick={onClose}>✕</button>
        </header>
        {children}
      </div>
    </div>
  );
}

function Done({ title, detail, signature, onClose }: { title: string; detail?: string; signature: string; onClose: () => void }) {
  return (
    <div className="done">
      <div className="tick" aria-hidden>✓</div>
      <h3>{title}</h3>
      {detail && <p className="muted">{detail}</p>}
      <a href={explorerTx(signature)} target="_blank" rel="noreferrer">See it on Solana Explorer ↗</a>
      <button className="primary" onClick={onClose}>Done</button>
    </div>
  );
}

function AddSheet({ session, applePay, onClose }: { session: Session; applePay: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signature, setSignature] = useState('');
  if (signature) {
    return <Done title={`${formatUsd(amount)} added`} detail="Test USDC is now in your wallet." signature={signature} onClose={onClose} />;
  }
  return (
    <>
      <div className="chips">
        {DEPOSITS.map((d) => (
          <button key={d} className={d === amount ? 'chip on' : 'chip'} onClick={() => setAmount(d)}>{formatUsd(d).replace('.00', '')}</button>
        ))}
      </div>
      <AddMoney amount={amount} applePay={applePay} session={session} onDone={setSignature} onError={setError} />
      <button
        className="primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            setSignature(await session.depositTestCard(amount));
          } catch (err) {
            setError(message(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Adding…' : `Add ${formatUsd(amount)} with test card`}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
      <p className="fine">Stripe test mode: no card is charged.</p>
    </>
  );
}

function SendSheet({ session, onClose }: { session: Session; onClose: () => void }) {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signature, setSignature] = useState('');
  const value = parseAmount(amount);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  if (signature && recipient && value) {
    return (
      <Done
        title={`${formatUsd(value)} sent`}
        detail={`${formatPhone(recipient.phone)} has it now. You paid no fees.`}
        signature={signature}
        onClose={onClose}
      />
    );
  }
  if (recipient && value) {
    const firstTime = !session.knownRecipient(recipient.phone);
    return (
      <>
        <div className="review">
          <span className="muted">Send</span>
          <strong className="review-amount">{formatUsd(value)}</strong>
          <span className="muted">to</span>
          <strong>{formatPhone(recipient.phone)}</strong>
        </div>
        {recipient.invited && (
          <p className="note">This number isn&apos;t on DAT yet. The money will be waiting in their own wallet when they sign up with this number.</p>
        )}
        {firstTime && (
          <p className="warn">First time sending here. Transfers can&apos;t be undone, so check the number. Never send because someone pressured you.</p>
        )}
        <button className="primary" disabled={busy} onClick={() => run(async () => setSignature(await session.send(recipient, value)))}>
          {busy ? 'Sending…' : `Send ${formatUsd(value)}`}
        </button>
        <button className="link" disabled={busy} onClick={() => setRecipient(null)}>Go back</button>
        {error && <p className="error" role="alert">{error}</p>}
      </>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value) return setError('Enter an amount');
        if (session.balance !== null && value > session.balance) return setError("You don't have enough for that.");
        run(async () => setRecipient(await session.findRecipient(phone)));
      }}
    >
      <label htmlFor="to">Their phone number</label>
      <input id="to" type="tel" inputMode="tel" placeholder="(555) 555-0142" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <label htmlFor="amt">Amount</label>
      <input id="amt" inputMode="decimal" placeholder="$0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
      <button className="primary" disabled={busy}>{busy ? 'Finding them…' : 'Continue'}</button>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}

function CashOutSheet({ session, onClose }: { session: Session; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signature, setSignature] = useState('');
  const value = parseAmount(amount);
  if (signature && value) {
    return (
      <>
        <ol className="steps">
          <li className="real"><b>USDC sent</b><span>Real test transfer</span></li>
          <li className="sim"><b>Converted to dollars</b><span>Simulated</span></li>
          <li className="sim"><b>{formatUsd(value)} in your bank ••4821</b><span>Simulated</span></li>
        </ol>
        <Done title="Cash-out complete" signature={signature} onClose={onClose} />
      </>
    );
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!value) return setError('Enter an amount');
        setBusy(true);
        setError('');
        try {
          setSignature(await session.toTreasury('cashout', 'Cash out to bank ••4821', value));
        } catch (err) {
          setError(message(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="out">Amount to cash out</label>
      <input id="out" inputMode="decimal" placeholder="$0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
      <div className="bank"><span>To</span><strong>Test bank ••4821</strong></div>
      <button className="primary" disabled={busy}>{busy ? 'Cashing out…' : 'Cash out'}</button>
      {error && <p className="error" role="alert">{error}</p>}
      <p className="fine">The USDC transfer is real on devnet. The bank payout is simulated.</p>
    </form>
  );
}

function CardSheet({ session, onClose }: { session: Session; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signature, setSignature] = useState('');
  if (signature) {
    return <Done title={`Paid ${MERCHANT.name}`} detail={`${formatUsd(MERCHANT.amount)} taken from your balance.`} signature={signature} onClose={onClose} />;
  }
  return (
    <>
      <div className="vcard">
        <span className="vcard-brand">DAT</span>
        <span className="vcard-num">•••• •••• •••• 4242</span>
        <span className="vcard-tag">Simulated card</span>
      </div>
      <button
        className="primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            setSignature(await session.toTreasury('card', MERCHANT.name, MERCHANT.amount));
          } catch (err) {
            setError(message(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Paying…' : `Tap to pay ${MERCHANT.name} ${formatUsd(MERCHANT.amount)}`}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
      <p className="fine">A real card needs an issuing partner. This shows the experience.</p>
    </>
  );
}

function ActivityRow({ item }: { item: Activity }) {
  const titles: Record<Activity['kind'], string> = { deposit: 'Added money', sent: 'Sent', received: 'Received', cashout: 'Cashed out', card: 'Card payment' };
  const label = item.kind === 'sent' ? formatPhone(item.label) : item.label;
  const body = (
    <>
      <span>
        <b>{titles[item.kind]}</b>
        <small>{label}</small>
      </span>
      <span className={item.amount > 0 ? 'amount plus' : 'amount'}>
        {item.amount > 0 ? '+' : '−'}{formatUsd(Math.abs(item.amount))}
      </span>
    </>
  );
  return item.signature ? (
    <li><a className="row" href={explorerTx(item.signature)} target="_blank" rel="noreferrer">{body}</a></li>
  ) : (
    <li><div className="row">{body}</div></li>
  );
}

export default function Home({ session, applePay }: { session: Session; applePay: boolean }) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState<number | null>(null);
  const close = () => setSheet(null);

  useEffect(() => {
    if (!session.received) return;
    setToast(session.received.amount);
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [session.received]);

  return (
    <main className="home">
      <div className="testnet">Test network · no real money</div>
      <header className="top">
        <span className="brand">DAT</span>
        <button className="link" onClick={session.logout}>Log out</button>
      </header>

      {toast !== null && (
        <div className="toast" role="status">
          <b>You received {formatUsd(toast)}</b>
          <span>It&apos;s in your wallet now</span>
        </div>
      )}

      <section className="balance">
        <span className="muted">Your dollars</span>
        <div className="amount-big">{session.balance === null ? '—' : formatUsd(session.balance)}</div>
        <a className="owned" href={explorerAddress(session.address)} target="_blank" rel="noreferrer">
          In your own wallet · {session.address.slice(0, 4)}…{session.address.slice(-4)} ↗
        </a>
      </section>

      <nav className="actions" aria-label="Actions">
        <button className="action main" onClick={() => setSheet('send')}>Send</button>
        <button className="action" onClick={() => setSheet('add')}>Add</button>
        <button className="action" onClick={() => setSheet('cashout')}>Cash out</button>
        <button className="action" onClick={() => setSheet('card')}>Card</button>
      </nav>

      <section className="card">
        <h2>Activity</h2>
        {session.activity.length === 0 ? (
          <p className="muted">Nothing yet. Add money to get started.</p>
        ) : (
          <ul className="activity">{session.activity.map((a) => <ActivityRow key={a.id} item={a} />)}</ul>
        )}
      </section>

      <HedgeChart />

      {session.phone && <p className="fine center">Signed in as {formatPhone(session.phone)}</p>}

      {sheet === 'add' && <SheetFrame title="Add money" onClose={close}><AddSheet session={session} applePay={applePay} onClose={close} /></SheetFrame>}
      {sheet === 'send' && <SheetFrame title="Send money" onClose={close}><SendSheet session={session} onClose={close} /></SheetFrame>}
      {sheet === 'cashout' && <SheetFrame title="Cash out" onClose={close}><CashOutSheet session={session} onClose={close} /></SheetFrame>}
      {sheet === 'card' && <SheetFrame title="Your card" onClose={close}><CardSheet session={session} onClose={close} /></SheetFrame>}
    </main>
  );
}
