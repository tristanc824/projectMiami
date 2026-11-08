import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { ContactNameButton } from '../components/ContactNameButton';
import { useContacts } from '../state/ContactsProvider';
import { AmountInput } from '../components/AmountInput';
import { RecipientPicker, demoPhones } from '../components/RecipientPicker';
import { Avatar, Button, DemoNote, Detail, Icon, Notice, Pill, Screen, Sheet } from '../components/ui';
import { reservedCents } from '../domain/savings';
import { contacts, DEMO_ARS_RATE, money, parseAmount } from '../domain/wallet';
import { formatPhone, normalizePhone, type Recipient } from '../services/dat';
import { useLive } from '../state/live';
import { useWallet } from '../state/WalletProvider';
import { useColors } from '../theme';

export default function SendScreen() {
  const live = useLive();
  if (live.status !== 'ready' && live.status !== 'off') return <Screen back title="Send to"><Notice>{live.problem || 'Sign in with your phone number to send money to another Nest account.'}</Notice><Button style={{ marginTop: 24 }} title="Sign in to send" onPress={() => router.push('/sign-in')} /></Screen>;
  return <SendFlow connected={live.status === 'ready'} />;
}

function SendFlow({ connected }: { connected: boolean }) {
  const { colors, styles: t } = useColors();
  const live = useLive();
  const { nameFor } = useContacts();
  const [editingText, setEditingText] = useState(false);
  const params = useLocalSearchParams<{ phone?: string; contact?: string; goalId?: string; amount?: string; note?: string }>();
  const { wallet, ready, execute } = useWallet();
  const goal = wallet.goals.find(g => g.id === params.goalId);
  const initialContact = !connected ? contacts.find(c => c.id === params.contact) : undefined;
  const [contactId, setContactId] = useState(initialContact?.id);
  const [phone, setPhone] = useState(typeof params.phone === 'string' ? normalizePhone(params.phone) ?? '' : initialContact ? demoPhones[initialContact.id] : '');
  const [picking, setPicking] = useState(!params.phone && !initialContact && !goal);
  const [amount, setAmount] = useState(goal ? String((goal.targetCents - goal.fundedCents) / 100) : typeof params.amount === 'string' && parseAmount(params.amount) ? params.amount : '0');
  const [note, setNote] = useState(goal?.description || (typeof params.note === 'string' ? params.note.slice(0, 140) : ''));
  const [review, setReview] = useState(false);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const reference = useRef<string | null>(null);
  const recipientPhone = normalizePhone(phone);
  const contact = contacts.find(c => c.id === contactId && demoPhones[c.id] === recipientPhone);
  const recipientName = nameFor(recipientPhone ?? undefined, contact?.name ?? (recipientPhone ? formatPhone(recipientPhone) : 'Enter their number'));
  const available = wallet.balanceCents - (connected ? 0 : reservedCents(wallet.savings));
  const cents = parseAmount(amount);
  const enough = cents !== null && cents <= available;
  const remaining = goal ? goal.targetCents - goal.fundedCents : Infinity;
  const valid = ready && !!recipientPhone && enough && cents !== null && cents <= remaining && !busy;
  const openReview = async () => {
    if (!valid) return;
    Keyboard.dismiss();
    setError('');
    if (!connected) { setReview(true); return; }
    setBusy(true);
    try { setRecipient(await live.findRecipient(phone)); setReview(true); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    if (!valid || !cents || !recipientPhone || submitting.current || connected && !recipient) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      reference.current ??= `demo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const id = connected ? await live.send(recipient!, cents, note) : execute({ id: reference.current, kind: 'send', recipientPhone, contactId: goal?.contactId ?? contact?.id, amountCents: cents, note, goalId: goal?.id, createdAt: new Date().toISOString() });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.replace({ pathname: '/receipt', params: { id } });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again.'); submitting.current = false; setBusy(false); }
  };
  if (picking) return <Screen back title="Send to" subtitle="A little closer, wherever they are."><RecipientPicker demo={!connected} activity={wallet.activity} onSelect={(value, id) => { setPhone(value); setContactId(id); setPicking(false); }} /><DemoNote /></Screen>;
  return <Screen back footer={<><Button title="Review transfer" icon="arrow-forward" onPress={() => { void openReview(); }} loading={busy} disabled={!valid} testID="review-transfer" /><DemoNote compact /></>}>
    <Pressable accessibilityRole="button" accessibilityLabel="Change recipient" onPress={() => setPicking(true)} style={[t.row, { alignSelf: 'center', gap: 10, paddingVertical: 10, marginBottom: 6 }]}>
      {contact ? <Avatar contact={contact} size={38} /> : <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}><Icon name="person-outline" color={colors.green} size={20} /></View>}<Text style={{ color: colors.ink, fontSize: 17, fontWeight: '500' }}>{recipientName}</Text><Icon name="chevron-down" size={15} color={colors.muted} />
    </Pressable>
    <AmountInput value={amount} onChange={setAmount} showKeypad={!editingText} detail={<>
      <Text style={[t.muted, { textAlign: 'center', marginTop: 8 }]}>≈ ARS {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(amount || 0) * DEMO_ARS_RATE)} · example rate</Text>
      <Text style={[t.muted, { textAlign: 'center', marginTop: 4 }]}>{money(available)} available</Text>
      <View style={[t.row, { justifyContent: 'center', gap: 8, marginTop: 18 }]}><Pill>No fee</Pill><Pill>{connected ? 'Solana devnet' : 'Demo payment'}</Pill></View>
    </>} />
    <TextInput accessibilityLabel="Recipient phone number" placeholder="Their phone number" placeholderTextColor={colors.muted} value={phone} onChangeText={value => { setPhone(value.slice(0, 24)); setError(''); }} onFocus={() => setEditingText(true)} onBlur={() => setEditingText(false)} keyboardType="phone-pad" textContentType="telephoneNumber" style={[t.body, { padding: 17, backgroundColor: colors.surface, borderRadius: 28 }]} />
    <Text style={[t.muted, { marginTop: 8, marginBottom: 12 }]}>Include the country code outside the US.</Text>
    {phone.length > 0 && !recipientPhone ? <Notice error>Enter a full phone number.</Notice> : null}
    {cents !== null && !enough ? <Notice error>{connected ? 'This is more than your available balance.' : 'This is more than your available demo balance.'}</Notice> : null}
    {cents !== null && cents > remaining ? <Notice error>This request only needs {money(remaining)} more.</Notice> : null}
    <TextInput accessibilityLabel="Payment note" placeholder="Add a note (optional)" placeholderTextColor={colors.muted} value={note} onChangeText={setNote} onFocus={() => setEditingText(true)} onBlur={() => setEditingText(false)} maxLength={140} style={[t.body, { padding: 17, backgroundColor: colors.surface, borderRadius: 28, marginTop: 12, marginBottom: 18 }]} />
    {recipientPhone ? <View style={{ marginBottom: 14 }}><ContactNameButton phone={recipientPhone} /></View> : null}
    {!review && error ? <Notice error>{error}</Notice> : null}
    <Sheet title="Review payment" visible={review} onClose={() => { if (!busy) setReview(false); }}>
      <View style={[t.row, { gap: 14, marginBottom: 24 }]}>{contact ? <Avatar contact={contact} size={56} /> : <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}><Icon name="call-outline" color={colors.green} /></View>}<View style={{ flex: 1 }}><Text style={t.heading}>Send {money(cents ?? 0)}</Text><Text style={[t.muted, { marginTop: 5 }]}>to {recipientName}</Text></View></View>
      <View style={[t.card, { marginBottom: 18 }]}><Detail label="Recipient" value={recipientPhone ? formatPhone(recipientPhone) : ''} /><Detail label="Fee" value="$0.00" /><Detail label="Payment" value={connected ? 'Test dollars · Solana devnet' : 'Local demo'} /><Detail label="Undo" value="Not available in this build" />{note ? <Detail label="Your note" value={note} /> : null}<View style={t.divider} /><Detail label={connected ? 'Total from your balance' : 'Total from demo balance'} value={money(cents ?? 0)} strong /></View>
      <Notice>{connected ? recipient?.invited ? 'This number is new to Nest. Their test dollars will be waiting when they sign in. This payment cannot be undone.' : 'This sends test dollars on Solana devnet. This payment cannot be undone.' : 'Demo payment only. No real money leaves this device.'}</Notice>
      {error ? <View style={{ marginTop: 12 }}><Notice error>{error}</Notice></View> : null}
      <Button style={{ marginTop: 22 }} title={connected ? 'Send now' : 'Confirm demo transfer'} icon="arrow-forward" onPress={() => { void confirm(); }} loading={busy} testID="confirm-transfer" />
      <Button style={{ marginTop: 10 }} title="Edit details" variant="secondary" onPress={() => setReview(false)} disabled={busy} />
    </Sheet>
  </Screen>;
}
