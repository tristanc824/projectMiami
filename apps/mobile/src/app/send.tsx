import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { AmountInput } from '../components/AmountInput';
import { Avatar, Button, DemoNote, Detail, Icon, Notice, Pill, Screen } from '../components/ui';
import { contacts, money, parseAmount } from '../domain/wallet';
import { formatPhone, normalizePhone, type Recipient } from '../services/dat';
import { useIsLive, useLive } from '../state/live';
import { useWallet } from '../state/WalletProvider';
import { useColors } from '../theme';

export default function SendScreen() {
  return useIsLive() ? <LiveSend /> : <DemoSend />;
}

/** Real devnet USDC to any phone number. Numbers not on Guard yet get a wallet waiting for them. */
function LiveSend() {
  const { colors, styles: t } = useColors();
  const live = useLive();
  const { wallet, ready } = useWallet();
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('0');
  const [note, setNote] = useState('');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const cents = parseAmount(amount);
  const enough = cents !== null && cents <= wallet.balanceCents;
  const canContinue = ready && enough && normalizePhone(phone) !== null && !busy;
  async function review() {
    setBusy(true); setError('');
    try { setRecipient(await live.findRecipient(phone)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  async function confirm() {
    if (!cents || !recipient || submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const id = await live.send(recipient, cents, note);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.replace({ pathname: '/receipt', params: { id } });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again.'); submitting.current = false; setBusy(false); }
  }
  return <Screen key={recipient ? 'review' : 'edit'} title={recipient ? 'Review payment' : undefined} subtitle={recipient ? 'Take a moment to check the details.' : undefined} back>
    {recipient && cents ? <>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 18 }}><View style={{ width: 74, height: 74, borderRadius: 37, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}><Icon name="call-outline" size={30} color={colors.accent} /></View><Text style={t.heading}>{formatPhone(recipient.phone)}</Text><Text style={{ fontSize: 47, color: colors.green, fontWeight: '600', letterSpacing: -1.8, marginTop: 8 }}>{money(cents)}</Text><Pill>USDC on Solana devnet</Pill></View>
      <View style={[t.card, { marginVertical: 20 }]}><Detail label="Recipient" value={formatPhone(recipient.phone)} /><Detail label="Network" value="Solana devnet" /><Detail label="Amount" value={`${money(cents)} USDC`} /><Detail label="Network fee" value="Paid by Guard" /><View style={t.divider} /><Detail label="Total from your balance" value={money(cents)} strong />{note ? <Detail label="Your note" value={note} /> : null}</View>
      <Notice>{recipient.invited ? 'This number isn’t on Guard yet. Their money will be waiting in a wallet they get when they sign in with this number.' : 'This sends test USDC on Solana devnet. Transfers can’t be undone.'}</Notice>
      {error ? <View style={{ marginTop: 12 }}><Notice error>{error}</Notice></View> : null}
      <Button style={{ marginTop: 24 }} title="Send now" icon="arrow-up-right-box-outline" onPress={() => { void confirm(); }} loading={busy} testID="confirm-transfer" />
      <Button style={{ marginTop: 10 }} title="Edit details" variant="secondary" onPress={() => { setRecipient(null); setError(''); }} disabled={busy} />
    </> : <>
      <AmountInput value={amount} onChange={setAmount} />
      <Text style={[t.muted, { textAlign: 'center', marginBottom: 18, fontSize: 12 }]}>Available: {money(wallet.balanceCents)} USDC</Text>
      <TextInput accessibilityLabel="Recipient phone number" placeholder="Their phone number" placeholderTextColor={colors.muted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" style={[t.body, { padding: 17, backgroundColor: colors.soft, borderRadius: 28 }]} />
      {cents !== null && !enough ? <View style={{ marginTop: 12 }}><Notice error>This is more than your available balance.</Notice></View> : null}
      <TextInput accessibilityLabel="Payment note" placeholder="Add a note (optional)" placeholderTextColor={colors.muted} value={note} onChangeText={setNote} maxLength={140} style={[t.body, { padding: 17, backgroundColor: colors.soft, borderRadius: 28, marginTop: 14, marginBottom: 12 }]} />
      {error ? <View style={{ marginBottom: 12 }}><Notice error>{error}</Notice></View> : null}
      <Button title="Review transfer" icon="arrow-forward" onPress={() => { void review(); }} loading={busy} disabled={!canContinue} testID="review-transfer" /><DemoNote />
    </>}
  </Screen>;
}

function DemoSend() {
  const { colors, styles: t } = useColors();
  const params = useLocalSearchParams<{ contactId?: string; goalId?: string }>();
  const { wallet, ready, execute } = useWallet();
  const goal = wallet.goals.find(item => item.id === params.goalId);
  const [contactId, setContactId] = useState(goal?.contactId || params.contactId || '');
  const contact = contacts.find(item => item.id === contactId);
  const [amount, setAmount] = useState(goal ? String((goal.targetCents - goal.fundedCents) / 100) : '0');
  const [note, setNote] = useState(goal?.description || '');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const reference = useRef<string | null>(null);
  const cents = parseAmount(amount);
  const enough = cents !== null && cents <= wallet.balanceCents;
  const remaining = goal ? goal.targetCents - goal.fundedCents : Infinity;
  const canContinue = ready && !!contact && enough && cents !== null && cents <= remaining;
  function confirm() {
    if (!cents || !contact || submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      reference.current ??= `demo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const id = execute({ id: reference.current, kind: 'send', contactId: contact.id, amountCents: cents, note, goalId: goal?.id, createdAt: new Date().toISOString() });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.replace({ pathname: '/receipt', params: { id } });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again.'); submitting.current = false; setBusy(false); }
  }
  return <Screen key={review ? 'review' : 'edit'} title={review ? 'Review payment' : undefined} subtitle={review ? 'Take a moment to check the details.' : undefined} back>
    {review && contact && cents ? <>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 18 }}><Avatar contact={contact} size={74} /><Text style={t.heading}>{contact.name}</Text><Text style={t.muted}>{contact.fullName} · {contact.location}</Text><Text style={{ fontSize: 47, color: colors.green, fontWeight: '600', letterSpacing: -1.8, marginTop: 8 }}>{money(cents)}</Text><Pill>USDC on Solana · Demo</Pill></View>
      <View style={[t.card, { marginVertical: 20 }]}><Detail label="Recipient" value={contact.fullName} /><Detail label="Network" value="Solana · preview only" /><Detail label="Amount" value={`${money(cents)} USDC`} /><Detail label="Demo transfer fee" value="$0.00" /><View style={t.divider} /><Detail label="Total from demo balance" value={money(cents)} strong />{note ? <Detail label="Your note" value={note} /> : null}</View>
      <Notice>This records a demo transfer on this device. No USDC is sent on-chain and no fiat payout is initiated.</Notice>
      {error ? <View style={{ marginTop: 12 }}><Notice error>{error}</Notice></View> : null}
      <Button style={{ marginTop: 24 }} title="Confirm demo transfer" icon="arrow-up-right-box-outline" onPress={confirm} loading={busy} testID="confirm-transfer" />
      <Button style={{ marginTop: 10 }} title="Edit details" variant="secondary" onPress={() => setReview(false)} disabled={busy} />
    </> : <>
      <AmountInput value={amount} onChange={setAmount} />
      <Text style={[t.muted, { textAlign: 'center', marginBottom: 18, fontSize: 12 }]}>Available: {money(wallet.balanceCents)} demo USDC</Text>
      <View style={[t.row, { gap: 8 }]}>{contacts.filter(item => !goal || item.id === goal.contactId).map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: contactId === item.id }} accessibilityLabel={`Recipient ${item.name}`} onPress={() => setContactId(item.id)} style={[t.row, { flex: 1, justifyContent: 'center', gap: 5, paddingVertical: 14, paddingHorizontal: 6, backgroundColor: contactId === item.id ? colors.mint : colors.soft, borderRadius: 28 }]}><Text style={{ color: contactId === item.id ? colors.accent : colors.ink, fontSize: 13, fontWeight: '700' }}>{item.name}</Text>{contactId === item.id ? <Icon name="checkmark-circle" color={colors.accent} size={16} /> : null}</Pressable>)}</View>
      <Text style={[t.muted, { fontSize: 11, textAlign: 'center', marginTop: 8 }]}>{contact ? `${contact.fullName} · ${contact.location}` : 'Choose who you’re paying'}</Text>
      {cents !== null && !enough ? <Notice error>This is more than your available demo balance.</Notice> : null}
      {cents !== null && cents > remaining ? <Notice error>This request only needs {money(remaining)} more.</Notice> : null}
      <TextInput accessibilityLabel="Payment note" placeholder="Add a note (optional)" placeholderTextColor={colors.muted} value={note} onChangeText={setNote} maxLength={140} style={[t.body, { padding: 17, backgroundColor: colors.soft, borderRadius: 28, marginTop: 14, marginBottom: 12 }]} />
      <Button title="Review transfer" icon="arrow-forward" onPress={() => setReview(true)} disabled={!canContinue} testID="review-transfer" /><DemoNote />
    </>}
  </Screen>;
}
