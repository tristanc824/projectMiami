import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { ContactNameButton } from '../components/ContactNameButton';
import { useContacts } from '../state/ContactsProvider';
import { AmountInput } from '../components/AmountInput';
import { RecipientPicker, demoPhones } from '../components/RecipientPicker';
import { Avatar, Button, DemoNote, Detail, Icon, Notice, Pill, Screen, Sheet } from '../components/ui';
import { reservedCents } from '../domain/savings';
import { contacts, DEMO_ARS_RATE, money, parseAmount } from '../domain/wallet';
import { formatPhone, normalizePhone, type Recipient } from '../services/dat';
import { reviewEnabled, type FamilyReview } from '../services/review';
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
  const { nameFor, contacts: savedContacts } = useContacts();
  const [editingText, setEditingText] = useState(false);
  const params = useLocalSearchParams<{ phone?: string; contact?: string; goalId?: string; amount?: string; note?: string; voiceTranscript?: string }>();
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
  const referenceDraft = useRef('');
  // Family review (Swarms + Prune): a transfer can only be sent once the check clears it.
  const [check, setCheck] = useState<Check>({ status: 'idle' });
  const checkRun = useRef(0);
  const checkedOnce = useRef(false);
  const reviewSession = useRef('');
  const [holdPin, setHoldPin] = useState('');
  const recipientPhone = normalizePhone(phone);
  const contact = contacts.find(c => c.id === contactId && demoPhones[c.id] === recipientPhone);
  const recipientName = nameFor(recipientPhone ?? undefined, contact?.name ?? (recipientPhone ? formatPhone(recipientPhone) : 'Enter their number'));
  const available = wallet.balanceCents - (connected ? 0 : reservedCents(wallet.savings));
  const cents = parseAmount(amount);
  const enough = cents !== null && cents <= available;
  const remaining = goal ? goal.targetCents - goal.fundedCents : Infinity;
  const valid = ready && !!recipientPhone && enough && cents !== null && cents <= remaining && !busy;
  const priorTransfers = wallet.activity.filter(a => a.kind === 'send' && !a.status && a.recipientPhone === recipientPhone).length;
  const knownRecipient = !!contact || savedContacts.some(c => c.phone === recipientPhone) || priorTransfers > 0;
  const draftKey = JSON.stringify([recipientPhone, cents, note]);
  const cleared = !reviewEnabled || knownRecipient || check.status === 'done' && check.key === draftKey && !check.result.held;
  const runCheck = async (target = recipient) => {
    if (!reviewEnabled || knownRecipient || !cents || !recipientPhone) return;
    if (!connected || !target) { setCheck({ status: 'failed', message: 'Sign in with your phone number to use on-chain Safe Holds.' }); return; }
    reviewSession.current ||= `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const run = ++checkRun.current;
    setCheck({ status: 'checking' });
    try {
      const result = await live.reviewPayment({
        amountCents: cents,
        requestedCents: goal ? goal.targetCents : cents,
        contributedCents: goal ? goal.fundedCents : 0,
        recipientInContacts: !!contact || savedContacts.some(c => c.phone === recipientPhone),
        priorTransfers,
        recipientAddress: target.address,
        session: reviewSession.current,
        note,
        transcript: typeof params.voiceTranscript === 'string' ? params.voiceTranscript.slice(0, 2000) : undefined,
      }, !checkedOnce.current);
      checkedOnce.current = true;
      if (run === checkRun.current) setCheck({ status: 'done', result, key: draftKey });
    } catch (failure) {
      if (run === checkRun.current) setCheck({ status: 'failed', message: failure instanceof Error ? failure.message : 'Please try again.' });
    }
  };
  const closeReview = () => { checkRun.current++; setCheck({ status: 'idle' }); setReview(false); };
  const openingReview = useRef(false);
  const openReview = async () => {
    if (!valid || openingReview.current) return;
    Keyboard.dismiss();
    setError('');
    if (!connected) { setReview(true); void runCheck(); return; }
    openingReview.current = true; setBusy(true);
    try { const target = await live.findRecipient(phone); setRecipient(target); setReview(true); void runCheck(target); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again.'); }
    finally { openingReview.current = false; setBusy(false); }
  };
  const confirm = async () => {
    if (!valid || !cents || !recipientPhone || !cleared || submitting.current || connected && !recipient) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const paymentDraft = JSON.stringify([recipientPhone, cents]);
      if (referenceDraft.current !== paymentDraft) { reference.current = null; referenceDraft.current = paymentDraft; }
      reference.current ??= `demo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const id = connected ? await live.send(recipient!, cents, note, reference.current) : execute({ id: reference.current, kind: 'send', recipientPhone, contactId: goal?.contactId ?? contact?.id, amountCents: cents, note, goalId: goal?.id, createdAt: new Date().toISOString() });
      router.replace({ pathname: '/receipt', params: { id, celebrate: '1' } });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again.'); submitting.current = false; setBusy(false); }
  };
  const placeHold = async () => {
    if (!valid || !connected || !recipient || !cents || submitting.current || check.status !== 'done' || check.key !== draftKey || !check.result.held || !/^\d{6}$/.test(holdPin)) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const state = await live.createHold(recipient, cents, check.result.reviewTicket, holdPin);
      setHoldPin('');
      router.replace({ pathname: '/hold', params: { state } });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'The hold could not be created.'); submitting.current = false; setBusy(false); }
  };
  const held = reviewEnabled && !knownRecipient && check.status === 'done' && check.key === draftKey && check.result.held;
  if (picking) return <Screen back title="Send to" subtitle="A little closer, wherever they are."><Button title="Talk to Nest" icon="mic-outline" variant="secondary" style={{ marginBottom: 18 }} onPress={() => router.push('/voice')} /><RecipientPicker demo={!connected} activity={wallet.activity} onSelect={(value, id) => { setPhone(value); setContactId(id); setPicking(false); }} /><DemoNote /></Screen>;
  return <Screen back footer={<><Button title="Review transfer" icon="arrow-forward" onPress={() => { void openReview(); }} loading={busy} disabled={!valid} testID="review-transfer" /><DemoNote compact /></>}>
    <Pressable accessibilityRole="button" accessibilityLabel="Change recipient" onPress={() => setPicking(true)} style={[t.row, { alignSelf: 'center', gap: 10, paddingVertical: 10, marginBottom: 6 }]}>
      <Avatar contact={{ id: recipientPhone ?? contact?.id ?? 'unknown' }} size={38} /><Text style={{ color: colors.ink, fontSize: 17, fontWeight: '500' }}>{recipientName}</Text><Icon name="chevron-down" size={15} color={colors.muted} />
    </Pressable>
    <Button title="Use voice" icon="mic-outline" variant="secondary" onPress={() => router.push({ pathname: '/voice', params: { phone } })} />
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
    <Sheet title="Review payment" visible={review} onClose={() => { if (!busy) closeReview(); }}>
      <View style={[t.row, { gap: 14, marginBottom: 24 }]}><Avatar contact={{ id: recipientPhone ?? contact?.id ?? 'unknown' }} size={56} /><View style={{ flex: 1 }}><Text style={t.heading}>Send {money(cents ?? 0)}</Text><Text style={[t.muted, { marginTop: 5 }]}>to {recipientName}</Text></View></View>
      <View style={[t.card, { marginBottom: 18 }]}><Detail label="Recipient" value={recipientPhone ? formatPhone(recipientPhone) : ''} /><Detail label="Fee" value="$0.00" /><Detail label="Payment" value={connected ? 'Test dollars · Solana devnet' : 'Local demo'} /><Detail label="Undo" value={held ? 'Available after placing a Safe Hold' : 'Instant payments cannot be undone'} />{note ? <Detail label="Your note" value={note} /> : null}<View style={t.divider} /><Detail label={connected ? 'Total from your balance' : 'Total from demo balance'} value={money(cents ?? 0)} strong /></View>
      {reviewEnabled && knownRecipient ? <View style={{ marginBottom: 14 }}><Notice>Known recipient · Saved in your contacts or paid before. This payment goes straight through after you confirm.</Notice></View> : <FamilyCheck check={check} onRetry={() => { void runCheck(); }} />}
      {held ? null : <Notice>{connected ? recipient?.invited ? 'This number is new to Nest. Their test dollars will be waiting when they sign in. This payment cannot be undone.' : 'This sends test dollars on Solana devnet. This payment cannot be undone.' : 'Demo payment only. No real money leaves this device.'}</Notice>}
      {error ? <View style={{ marginTop: 12 }}><Notice error>{error}</Notice>{/pending|confirmation/i.test(error) ? <Button title="Check Activity" variant="secondary" style={{ marginTop: 12 }} onPress={() => { closeReview(); router.push('/activity'); }} /> : null}</View> : null}
      {held ? <>
        <Text style={[t.muted, { marginTop: 12, marginBottom: 8 }]}>Choose a 6-digit release PIN. Keep it for when you release this hold.</Text>
        <TextInput accessibilityLabel="Safe Hold release PIN" value={holdPin} onChangeText={value => setHoldPin(value.replace(/\D/g, '').slice(0, 6))} maxLength={6} secureTextEntry keyboardType="number-pad" placeholder="6-digit PIN" placeholderTextColor={colors.muted} style={[t.body, { padding: 16, borderRadius: 18, backgroundColor: colors.surface }]} />
        <Notice>You approve your own hold. The recipient cannot spend it yet. You can cancel, wait 24 hours, or explicitly release early after checking who you are paying.</Notice>
        <Button style={{ marginTop: 22 }} title="Place in 24-hour Safe Hold" icon="lock-closed-outline" onPress={() => { void placeHold(); }} loading={busy} disabled={!connected || !valid || holdPin.length !== 6} testID="confirm-safe-hold" />
      </> : <Button style={{ marginTop: 22 }} title={connected ? 'Send now' : 'Confirm demo transfer'} icon="arrow-forward" onPress={() => { void confirm(); }} loading={busy} disabled={!cleared || !valid} testID="confirm-transfer" />}
      <Button style={{ marginTop: 10 }} title="Edit details" variant="secondary" onPress={closeReview} disabled={busy} />
    </Sheet>
  </Screen>;
}

type Check = { status: 'idle' } | { status: 'checking' } | { status: 'failed'; message: string } | { status: 'done'; result: FamilyReview; key: string };

/** What the Swarms review said: checking, cleared, held (Safe Hold / stop), or failed (never an approval). */
function FamilyCheck({ check, onRetry }: { check: Check; onRetry: () => void }) {
  const { colors, styles: t } = useColors();
  const box = { padding: 16, borderRadius: 20, marginBottom: 14, gap: 8 } as const;
  const title = { color: colors.ink, fontSize: 15, fontWeight: '600' } as const;
  if (check.status === 'idle') return null;
  if (check.status === 'checking') return <View style={[box, { backgroundColor: colors.surface }]} accessibilityLiveRegion="polite" testID="family-check-running">
    <View style={[t.row, { gap: 10 }]}><ActivityIndicator color={colors.ink} /><Text style={title}>Checking this transfer</Text></View>
    <Text style={t.muted}>{"Nest's safety agents are reviewing the amount and the person. This can take up to two minutes. Nothing has been sent."}</Text>
  </View>;
  if (check.status === 'failed') return <View style={{ marginBottom: 14, gap: 10 }}><Notice error>{check.message}</Notice><Button title="Check again" variant="secondary" icon="refresh" onPress={onRetry} /></View>;
  const { result } = check;
  if (!result.held) return <View style={[box, { backgroundColor: colors.mintLight }]} testID="family-check-cleared">
    <View style={[t.row, { gap: 8 }]}><Icon name="shield-checkmark-outline" size={19} /><Text style={title}>Checked by Nest</Text></View>
    {result.sentence ? <Text style={t.body}>{result.sentence}</Text> : null}
  </View>;
  return <View style={[box, { backgroundColor: colors.dangerBg }]} accessibilityRole="alert" testID="family-check-held">
    <View style={[t.row, { gap: 8 }]}><Icon name="hand-left-outline" size={19} color={colors.danger} /><Text style={title}>{result.decision === 'stop' ? 'Stop. This looks like a scam' : 'Safe Hold'}</Text></View>
    {result.sentence ? <Text style={t.body}>{result.sentence}</Text> : null}
    {result.signals.slice(0, 4).map(signal => <Text key={signal.code} style={t.muted}>• {signal.text}</Text>)}
    <Text style={[t.muted, { marginTop: 4 }]}>This number is unfamiliar. Call or text them using a trusted number you already have before releasing the hold.</Text>
  </View>;
}
