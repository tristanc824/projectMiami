import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import { AmountInput } from '../components/AmountInput';
import { Button, DemoNote, Detail, Icon, Notice, Pill, Screen } from '../components/ui';
import { DEMO_MXN_RATE, money, parseAmount } from '../domain/wallet';
import { MAX_DEPOSIT_DOLLARS } from '../services/dat';
import { useIsLive, useLive } from '../state/live';
import { useWallet } from '../state/WalletProvider';
import { useColors } from '../theme';

export default function MoneyScreen() {
  return useIsLive() ? <LiveMoney /> : <DemoMoney />;
}

/** Add: Stripe test card, then the treasury sends devnet USDC. Withdraw: real USDC back to the treasury; the bank payout is simulated. */
function LiveMoney() {
  const { colors, styles: t } = useColors();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const adding = mode !== 'withdraw';
  const live = useLive();
  const { wallet, ready } = useWallet();
  const [amount, setAmount] = useState('0');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const cents = parseAmount(amount);
  const wholeDollars = cents !== null && cents % 100 === 0 && cents / 100 <= MAX_DEPOSIT_DOLLARS;
  const valid = ready && cents !== null && (adding ? wholeDollars : cents <= wallet.balanceCents);
  const complete = async () => {
    if (!valid || !cents || submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const id = adding ? await live.deposit(cents / 100) : await live.cashOut(cents);
      router.replace({ pathname: '/receipt', params: { id } });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again.'); submitting.current = false; setBusy(false); }
  };
  return <Screen key={review ? 'review' : 'edit'} back title={adding ? 'A little more possibility.' : 'Ready for real life.'} subtitle={adding ? 'Add digital dollars to your wallet.' : 'Move money from your wallet to a bank.'}>
    <View style={[t.card, t.row, { gap: 12 }]}><View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: colors.mintLight, alignItems: 'center', justifyContent: 'center' }}><Icon name={adding ? 'card-outline' : 'business-outline'} color={colors.green} /></View><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontSize: 14, fontWeight: '600' }}>{adding ? 'Stripe test card' : 'Bank payout'}</Text><Text style={t.muted}>{adding ? 'Test mode · no real charge' : 'Simulated · no bank connected'}</Text></View><Pill>{adding ? 'Test' : 'Simulated'}</Pill></View>
    {review && cents ? <View style={[t.card, { marginVertical: 25 }]}><Detail label={adding ? 'Add to your wallet' : 'Cash out'} value={`${money(cents)} USDC`} /><Detail label="Network fee" value="Paid by Guard" /><View style={t.divider} /><Detail strong label="Balance after" value={money(adding ? wallet.balanceCents + cents : wallet.balanceCents - cents)} /></View> : <AmountInput value={amount} onChange={setAmount} />}
    <Notice>{adding ? `Charges Stripe's test card, never a real one. Then real test USDC arrives on Solana devnet. Whole dollars, up to $${MAX_DEPOSIT_DOLLARS}.` : 'Your USDC really leaves your wallet on Solana devnet. The bank payout is simulated, so no money reaches a bank.'}</Notice>
    {adding && cents !== null && !wholeDollars ? <View style={{ marginTop: 12 }}><Notice error>Choose a whole-dollar amount from $1 to ${MAX_DEPOSIT_DOLLARS}.</Notice></View> : null}
    {!adding && cents !== null && cents > wallet.balanceCents ? <View style={{ marginTop: 12 }}><Notice error>This is more than your available balance.</Notice></View> : null}
    {error ? <View style={{ marginTop: 12 }}><Notice error>{error}</Notice></View> : null}
    <Button style={{ marginTop: 22 }} title={review ? adding ? 'Add money' : 'Cash out' : 'Review details'} loading={busy} disabled={!valid} onPress={() => { if (review) void complete(); else setReview(true); }} />
    {review ? <Button style={{ marginTop: 10 }} title="Edit amount" variant="secondary" disabled={busy} onPress={() => setReview(false)} /> : null}<DemoNote />
  </Screen>;
}

function DemoMoney() {
  const { colors, styles: t } = useColors();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const adding = mode !== 'withdraw';
  const { wallet, ready, execute } = useWallet();
  const [amount, setAmount] = useState('0');
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const reference = useRef<string | null>(null);
  const cents = parseAmount(amount);
  const fee = adding ? 0 : 50;
  const valid = ready && cents !== null && (adding || cents + fee <= wallet.balanceCents);
  const complete = () => {
    if (!valid || !cents || submitting.current) return;
    submitting.current = true;
    try { reference.current ??= `demo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; const id = execute({ id: reference.current, kind: adding ? 'add' : 'withdraw', amountCents: cents, createdAt: new Date().toISOString(), note: adding ? 'Simulated funding · no card charged' : 'Simulated cash-out · no bank payout' }); router.replace({ pathname: '/receipt', params: { id } }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again.'); submitting.current = false; }
  };
  return <Screen key={review ? 'review' : 'edit'} back title={adding ? 'A little more possibility.' : 'Ready for real life.'} subtitle={adding ? 'Preview adding digital dollars to your balance.' : 'Explore how a local-currency withdrawal could work.'}>
    <View style={[t.card, t.row, { gap: 12 }]}><View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: colors.mintLight, alignItems: 'center', justifyContent: 'center' }}><Icon name={adding ? 'card-outline' : 'business-outline'} color={colors.green} /></View><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontSize: 14, fontWeight: '600' }}>{adding ? 'Sample debit card' : 'Sample Mexico bank payout'}</Text><Text style={t.muted}>{adding ? 'No payment method connected' : 'MXN illustration · no bank connected'}</Text></View><Pill>Demo</Pill></View>
    {review && cents ? <View style={[t.card, { marginVertical: 25 }]}><Detail label={adding ? 'Add to demo balance' : 'Withdraw from demo balance'} value={`${money(cents)} USDC`} /><Detail label="Illustrative fee" value={money(fee)} />{!adding ? <><Detail label="Example exchange rate" value={`1 USDC = ${DEMO_MXN_RATE.toFixed(2)} MXN`} /><Detail label="Illustrative recipient amount" value={`${money(Math.round(cents * DEMO_MXN_RATE), 'MXN')} MXN`} /></> : null}<View style={t.divider} /><Detail strong label={adding ? 'Demo balance after' : 'Total demo debit'} value={money(adding ? wallet.balanceCents + cents : cents + fee)} /></View> : <AmountInput value={amount} onChange={setAmount} />}
    <Notice>{adding ? 'Preview only. No card is charged and no USDC is purchased.' : 'This example rate and fee are illustrative, not a live quote. No USDC leaves a wallet and no bank payout is made.'}</Notice>
    {!adding && cents !== null && !valid ? <View style={{ marginTop: 12 }}><Notice error>Your demo balance must cover the amount and $0.50 example fee.</Notice></View> : null}
    {error ? <View style={{ marginTop: 12 }}><Notice error>{error}</Notice></View> : null}
    <Button style={{ marginTop: 22 }} title={review ? adding ? 'Confirm demo top-up' : 'Confirm demo withdrawal' : 'Review details'} disabled={!valid} onPress={() => review ? complete() : setReview(true)} />
    {review ? <Button style={{ marginTop: 10 }} title="Edit amount" variant="secondary" onPress={() => setReview(false)} /> : null}<DemoNote />
  </Screen>;
}
