import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { Text } from '../components/Text';
import { AppleCashDemoConfirmation } from '../components/AppleCashDemoConfirmation';
import { AmountInput } from '../components/AmountInput';
import { Button, DemoNote, Detail, Icon, Notice, Pill, Screen } from '../components/ui';
import { reservedCents } from '../domain/savings';
import { MAX_DEMO_CENTS, money, parseAmount, type WithdrawalDestination } from '../domain/wallet';
import { MAX_DEPOSIT_DOLLARS, type FundingStatus } from '../services/dat';
import { useLive } from '../state/live';
import { useWallet } from '../state/WalletProvider';
import { useColors } from '../theme';

export default function MoneyScreen() {
  const { colors, styles: t } = useColors();
  const { mode, destination: requestedDestination } = useLocalSearchParams<{ mode?: string; destination?: string }>();
  const adding = mode !== 'withdraw';
  const live = useLive();
  const { wallet, ready, execute } = useWallet();
  const [destination, setDestination] = useState<WithdrawalDestination>(requestedDestination === 'apple-cash' ? 'apple-cash' : 'bank');
  const appleCashDemo = !adding && destination === 'apple-cash';
  const connected = live.status === 'ready';
  const needsSignIn = live.status !== 'off' && live.status !== 'ready';
  const [amount, setAmount] = useState('0');
  const [review, setReview] = useState(false);
  const [confirmAppleCash, setConfirmAppleCash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const reference = useRef<string | null>(null);
  const referenceDraft = useRef('');
  const getFundingStatus = live.getFundingStatus;
  const [funding, setFunding] = useState<FundingStatus | null>(null);
  const [fundingError, setFundingError] = useState('');
  const [checkingFunding, setCheckingFunding] = useState(connected && adding);
  const refreshFunding = useCallback(async () => {
    setCheckingFunding(true); setFundingError('');
    try { setFunding(await getFundingStatus()); }
    catch { setFunding(null); setFundingError('Could not check test funding. Try again before adding money.'); }
    finally { setCheckingFunding(false); }
  }, [getFundingStatus]);
  useEffect(() => {
    if (!connected || !adding) return;
    let active = true;
    void getFundingStatus().then(value => { if (active) { setFunding(value); setFundingError(''); } }).catch(() => { if (active) setFundingError('Could not check test funding. Try again before adding money.'); }).finally(() => { if (active) setCheckingFunding(false); });
    return () => { active = false; };
  }, [connected, adding, getFundingStatus]);
  const depositCap = funding?.maxDepositDollars ?? MAX_DEPOSIT_DOLLARS;
  const cents = parseAmount(amount);
  const fee = adding || connected ? 0 : 50;
  const available = wallet.balanceCents - (connected ? 0 : reservedCents(wallet.savings));
  const withdrawable = Math.min(MAX_DEMO_CENTS, Math.max(0, available - fee));
  const wholeDollars = cents !== null && cents % 100 === 0 && cents / 100 <= depositCap;
  const valid = !needsSignIn && ready && cents !== null && (adding ? !connected || wholeDollars && !!funding && cents / 100 <= funding.availableDollars && !checkingFunding : cents + fee <= available);
  const destinationName = destination === 'apple-cash' ? 'Apple Cash' : 'Bank account';
  const primaryTitle = review ? connected ? adding ? 'Add money' : 'Confirm test cash-out' : adding ? 'Confirm demo top-up' : 'Confirm demo withdrawal' : 'Review details';
  const complete = async () => {
    if (!valid || !cents || busy || submitting.current) return;
    Keyboard.dismiss(); submitting.current = true; setBusy(true); setError('');
    try {
      let id: string;
      const paymentDraft = JSON.stringify([adding, cents, destination]);
      if (referenceDraft.current !== paymentDraft) { reference.current = null; referenceDraft.current = paymentDraft; }
      reference.current ??= `${connected ? 'payment' : 'demo'}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      if (connected) {
        id = adding ? await live.deposit(cents / 100, reference.current) : await live.cashOut(cents, destination, reference.current);
      } else {
        reference.current ??= `demo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        id = execute({ id: reference.current, kind: adding ? 'add' : 'withdraw', amountCents: cents, ...(adding ? {} : { withdrawalDestination: destination }), createdAt: new Date().toISOString(), note: adding ? 'Simulated funding · no card charged' : `Simulated withdrawal to ${destinationName} · no payout made` });
      }
      router.replace({ pathname: '/receipt', params: { id, celebrate: '1', ...(appleCashDemo ? { animation: 'apple-cash', ...(!connected ? { demo: '1' } : {}) } : {}) } });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again.'); submitting.current = false; setBusy(false); }
  };
  // Cash-out is not part of Nest yet: withdrawals and the Apple Cash demo are hidden.
  if (mode === 'withdraw') return <Redirect href="/" />;
  return <Screen scrollResetKey={review ? 'review' : 'amount'} back title={adding ? 'Add money' : 'Withdraw'} subtitle={adding ? 'A little more possibility.' : 'Choose where your money goes.'} footer={<>
    <Button title={primaryTitle} loading={busy} disabled={!valid} onPress={() => { if (review) { if (appleCashDemo) setConfirmAppleCash(true); else void complete(); } else { Keyboard.dismiss(); setError(''); setReview(true); } }} />
    {review ? <Button title="Edit amount" variant="secondary" style={{ marginTop: 8 }} disabled={busy} onPress={() => { setReview(false); setError(''); }} /> : null}<DemoNote compact />
  </>}>
    {confirmAppleCash && appleCashDemo && cents ? <AppleCashDemoConfirmation amountCents={cents} feeCents={fee} balanceAfterCents={wallet.balanceCents - cents - fee} disabled={!valid || busy} onCancel={() => setConfirmAppleCash(false)} onConfirm={() => { setConfirmAppleCash(false); void complete(); }} /> : null}
    {adding ? <View style={[t.card, t.row, { gap: 12 }]}><View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}><Icon name="card-outline" color={colors.green} /></View><View style={{ flex: 1 }}><Text style={t.body}>{connected ? 'Stripe test card' : 'Sample debit card'}</Text><Text style={t.muted}>{connected ? 'Test mode · no real charge' : 'No card is charged'}</Text></View><Pill>{connected ? 'Test' : 'Demo'}</Pill></View> : <View accessibilityRole="radiogroup" accessibilityLabel="Withdrawal destination" style={{ gap: 10, marginBottom: 14, flexDirection: 'row' }}>
      {([{ value: 'bank', label: 'Bank account', icon: 'business-outline', subtitle: 'Keep your bank withdrawal' }, { value: 'apple-cash', label: 'Apple Cash', icon: 'logo-apple', subtitle: 'Try a demo withdrawal' }] as const).map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={`Withdraw to ${option.label}`} aria-checked={destination === option.value} accessibilityState={{ checked: destination === option.value, disabled: busy }} disabled={busy} onPress={() => { setDestination(option.value); setReview(false); setError(''); }} style={[t.row, { flex: 1, flexDirection: 'column', alignItems: 'stretch', gap: 8, minHeight: 116, padding: 16, borderRadius: 24, borderWidth: 1.5, borderColor: destination === option.value ? colors.green : colors.line, backgroundColor: colors.surface }]}>
        <View style={t.between}><Icon name={option.icon} color={colors.green} size={24} /><Icon name={destination === option.value ? 'radio-button-on' : 'radio-button-off'} size={21} color={destination === option.value ? colors.green : colors.muted} /></View>
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '600' }}>{option.label}</Text><Text style={t.muted}>{option.value === 'apple-cash' ? 'Demo · no real payout' : live.status === 'ready' ? 'Test cash-out' : 'Demo only'}</Text>
      </Pressable>)}
    </View>}
    {appleCashDemo && ready && !needsSignIn && withdrawable === 0 && !review ? <View style={{ gap: 10, marginBottom: 14 }}><Text style={t.muted}>Add money to your Nest account to make a withdrawal.</Text><Button title="Add money" variant="secondary" onPress={() => router.push({ pathname: '/money', params: { mode: 'add' } })} /></View> : null}
    {needsSignIn ? <View style={{ gap: 12, marginBottom: 16 }}><Notice>{adding ? 'Sign in to your connected wallet to add test dollars.' : 'Sign in to your connected wallet to withdraw from your account balance.'}</Notice><Button title="Sign in" onPress={() => router.push('/sign-in')} /></View> : null}
    {review && cents ? <View style={[t.card, { marginVertical: 22 }]}>
      {!adding ? <Detail label="Destination" value={destinationName} strong /> : null}<Detail label={adding ? 'Add to your balance' : 'Withdrawal amount'} value={money(cents)} /><Detail label={connected ? 'Network fee' : 'Example fee'} value={connected ? 'Paid by Nest' : money(fee)} />
      {!adding ? <Detail label="Payout status" value="Not connected · preview only" /> : null}<View style={t.divider} /><Detail strong label="Account balance after" value={money(adding ? wallet.balanceCents + cents : wallet.balanceCents - cents - fee)} />
    </View> : <AmountInput demo={!connected} compact={!adding} value={amount} onChange={value => { setAmount(value); setError(''); }} detail={!adding ? <View style={{ alignItems: 'center', marginTop: 8 }}><Text style={t.muted}>{ready && !needsSignIn ? `${money(withdrawable)} available to withdraw` : 'Waiting for your account balance…'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Use available balance" disabled={!ready || needsSignIn || withdrawable === 0 || busy} onPress={() => setAmount((withdrawable / 100).toFixed(2))} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.green, fontSize: 14, fontWeight: '500' }}>Use available balance</Text></Pressable></View> : undefined} />}
    <Notice>{adding ? connected ? `Uses a Stripe test card. Test dollars arrive on devnet. Whole dollars, up to $${depositCap}.` : 'Preview only. No card is charged.' : destination === 'apple-cash' ? connected ? 'Uses your Nest account balance. Confirming returns test dollars to the demo treasury on Solana devnet. The Apple Cash payout is simulated; no money arrives in Apple Cash.' : 'Uses your Nest demo account balance. The amount and example fee are deducted from that balance. No real money arrives in Apple Cash.' : connected ? 'Confirming sends test dollars to the demo treasury. No money arrives in a bank account.' : 'Bank withdrawal demo only. The fee is an example; no bank payout is made.'}</Notice>
    {adding && connected && cents !== null && !wholeDollars ? <View style={{ marginTop: 12 }}><Notice error>Choose a whole-dollar amount from $1 to ${depositCap}.</Notice></View> : null}
    {!adding && ready && !needsSignIn && cents !== null && !valid ? <View style={{ marginTop: 12 }}><Notice error>{connected ? 'This is more than your available balance.' : 'Your available demo balance must cover the amount and $0.50 example fee.'}</Notice></View> : null}
    {adding && connected && (fundingError || funding && cents !== null && cents / 100 > funding.availableDollars) ? <View style={{ marginTop: 12, gap: 12 }}><Notice error>{fundingError || `Only $${funding!.availableDollars} in test funding is available right now. No card payment has been started. The demo team needs to replenish funding for larger amounts.`}</Notice><Button title="Refresh test funding" loading={checkingFunding} variant="secondary" onPress={() => { void refreshFunding(); }} /></View> : null}
    {adding && connected && checkingFunding ? <Text style={[t.muted, { marginTop: 12 }]}>Checking test funding…</Text> : null}
    {error ? <View style={{ marginTop: 12 }}><Notice error>{error}</Notice></View> : null}
  </Screen>;
}
