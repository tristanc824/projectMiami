import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { Button, Detail, Icon, Notice, Screen, Sheet } from '../components/ui';
import type { SafeHold } from '../services/holds';
import { money } from '../domain/wallet';
import { useLive } from '../state/live';
import { useColors } from '../theme';

export default function HoldScreen() {
  const live = useLive();
  const { colors, styles: t } = useColors();
  const { state } = useLocalSearchParams<{ state?: string }>();
  const [holds, setHolds] = useState<{ owner: string; items: SafeHold[] }>({ owner: '', items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [action, setAction] = useState<{ hold: SafeHold; kind: 'refund' | 'release' | 'release-early' } | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const getHolds = live.getHolds;
  const owner = live.status === 'ready' ? live.address : '';
  useEffect(() => {
    if (!owner) return;
    let active = true;
    void getHolds().then(result => {
      if (!active) return;
      setHolds({ owner, items: result.holds });
      setError(result.available ? '' : result.reason || 'Safe Holds are not available yet.');
    }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Could not load Safe Holds.'); }).finally(() => { if (active) setLoading(false); });
    const timer = setInterval(() => { if (active) setNow(Date.now()); }, 1000);
    return () => { active = false; clearInterval(timer); };
  }, [owner, getHolds]);
  const items = holds.owner === owner ? holds.items : [];
  const sorted = [...items].sort((a, b) => a.state === state ? -1 : b.state === state ? 1 : b.releaseAfter - a.releaseAfter);
  const open = (hold: SafeHold, kind: 'refund' | 'release' | 'release-early') => { setPin(''); setAction({ hold, kind }); setError(''); };
  const complete = async () => {
    if (!action || submitting.current || (action.kind !== 'refund' && !/^\d{6}$/.test(pin))) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      await live.manageHold(action.hold, action.kind, pin, action.kind === 'release-early');
      setHolds(current => ({ ...current, items: current.items.filter(item => item.state !== action.hold.state) }));
      setMessage(action.kind === 'refund' ? 'Hold cancelled. The test dollars are back in your wallet.' : 'Hold released. The test dollars were sent to the recipient.');
      setAction(null); setPin('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not complete this hold action.'); }
    finally { submitting.current = false; setBusy(false); }
  };
  if (live.status !== 'ready') return <Screen back title="Safe Holds"><Notice>Sign in with your phone number to manage on-chain Safe Holds.</Notice><Button title="Sign in" style={{ marginTop: 18 }} onPress={() => router.push('/sign-in')} /></Screen>;
  return <Screen back title="Safe Holds" subtitle="A little time to check who you’re paying.">
    {message ? <View style={{ marginBottom: 16 }}><Notice>{message}</Notice></View> : null}
    {error && !action ? <View style={{ marginBottom: 16 }}><Notice error>{error}</Notice></View> : null}
    {loading ? <Text style={t.muted}>Loading on-chain holds…</Text> : null}
    {!loading && !items.length ? <View style={[t.card, { gap: 10 }]}><Text style={t.heading}>No active holds.</Text><Text style={t.muted}>Payments to unfamiliar numbers will appear here after you place them on hold.</Text></View> : null}
    {sorted.map(hold => {
      const seconds = Math.max(0, hold.releaseAfter - Math.floor(now / 1000));
      const sender = hold.sender === live.address;
      return <View key={hold.state} testID={`hold-${hold.state}`} style={[t.card, { marginBottom: 18, gap: 10 }]}><View style={[t.row, { gap: 10 }]}><Icon name="lock-closed-outline" color={colors.green} /><Text style={t.heading}>{money(hold.amountCents)} in Safe Hold</Text></View>
        <Text style={t.muted}>{sender ? 'Your money is held on devnet. It has not reached the recipient.' : 'This payment is held until its sender releases it.'}</Text>
        <Detail label="Time remaining" value={seconds ? `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m ${seconds % 60}s` : 'Cooling-off complete'} />
        <Detail label="Recipient wallet" value={`${hold.recipient.slice(0, 6)}…${hold.recipient.slice(-6)}`} />
        <Text selectable style={[t.muted, { fontSize: 11 }]}>Hold: {hold.state}</Text>
        {sender ? <><Button title={seconds ? 'Release early' : 'Release payment'} variant={seconds ? 'secondary' : 'primary'} onPress={() => open(hold, seconds ? 'release-early' : 'release')} /><Button title="Cancel and return money" variant="light" onPress={() => open(hold, 'refund')} /></> : null}
      </View>;
    })}
    <Button title="Refresh holds" variant="secondary" disabled={loading || busy} onPress={() => { setLoading(true); void getHolds().then(result => { setHolds({ owner, items: result.holds }); setError(result.available ? '' : result.reason || 'Safe Holds are not available yet.'); }).catch(failure => setError(failure instanceof Error ? failure.message : 'Could not refresh holds.')).finally(() => setLoading(false)); }} />
    <Sheet title={action?.kind === 'refund' ? 'Cancel this hold?' : action?.kind === 'release-early' ? 'Check before releasing early' : 'Release this payment?'} visible={!!action} onClose={() => { if (!busy) { setAction(null); setPin(''); setError(''); } }}>
      <Text style={[t.heading, { marginBottom: 16 }]}>{money(action?.hold.amountCents ?? 0)} · Test dollars</Text>
      <Notice>{action?.kind === 'refund' ? 'This returns the held test dollars to your wallet. The recipient receives nothing.' : action?.kind === 'release-early' ? 'Call or text the person using a trusted number you already have. Verify their identity and payment details before overriding the 24-hour wait. Once released, the payment cannot be undone.' : 'The cooling-off period is complete. Check the recipient again before releasing. This payment cannot be undone.'}</Notice>
      {action?.kind !== 'refund' ? <><Text style={[t.muted, { marginTop: 18, marginBottom: 8 }]}>Enter the release PIN you chose when creating this hold.</Text><TextInput accessibilityLabel="Release PIN" value={pin} onChangeText={value => setPin(value.replace(/\D/g, '').slice(0, 6))} maxLength={6} secureTextEntry keyboardType="number-pad" placeholder="6-digit PIN" placeholderTextColor={colors.muted} style={[t.body, { padding: 16, borderRadius: 18, backgroundColor: colors.surface }]} /></> : null}
      {error ? <View style={{ marginTop: 16 }}><Notice error>{error}</Notice></View> : null}
      <Button title={action?.kind === 'refund' ? 'Confirm cancellation' : action?.kind === 'release-early' ? 'I verified them — release early' : 'Confirm release'} style={{ marginTop: 20 }} loading={busy} disabled={action?.kind !== 'refund' && pin.length !== 6} onPress={() => { void complete(); }} />
    </Sheet>
  </Screen>;
}
