import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { Button, DemoNote, Detail, Icon, Notice, Screen, Sheet } from '../components/ui';
import { initialSavings, reservedCents } from '../domain/savings';
import { money, parseAmount } from '../domain/wallet';
import { useIsLive } from '../state/live';
import { useWallet } from '../state/WalletProvider';
import { useColors } from '../theme';

export default function GoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, styles: t } = useColors();
  const { wallet, save, ready } = useWallet();
  const live = useIsLive();
  const goals = wallet.savings ?? initialSavings();
  const goal = goals.find(g => g.id === id);
  const [mode, setMode] = useState<'add' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const cents = parseAmount(amount);
  if (!goal) return <Screen back title="Goal unavailable"><Notice>This goal could not be found on this device.</Notice></Screen>;
  const available = wallet.balanceCents - reservedCents(goals);
  const valid = cents !== null && cents <= (mode === 'add' ? Math.min(available, goal.targetCents - goal.savedCents) : goal.savedCents);
  const update = () => {
    if (!mode || !cents) return;
    try { save({ kind: mode, goalId: goal.id, amountCents: cents }); setMode(null); setAmount(''); setError(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again.'); }
  };
  return <Screen back>
    <View style={{ alignItems: 'center', gap: 12, marginTop: 24, marginBottom: 36 }}><View style={{ width: 68, height: 68, borderRadius: 24, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}><Icon name={goal.icon} size={32} color={colors.green} /></View><Text accessibilityRole="header" style={[t.title, { fontSize: 30, marginTop: 10 }]}>{goal.name}</Text><Text testID="goal-balance" style={{ color: colors.ink, fontSize: 58, fontWeight: '600', letterSpacing: -2, fontVariant: ['tabular-nums'] }}>{money(goal.savedCents)}</Text><Text style={t.muted}>of {money(goal.targetCents)}</Text></View>
    <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.track, overflow: 'hidden', marginBottom: 24 }}><View style={{ height: 10, borderRadius: 5, backgroundColor: colors.green, width: `${goal.savedCents / goal.targetCents * 100}%` }} /></View>
    <View style={t.card}><Detail label="Progress" value={`${Math.round(goal.savedCents / goal.targetCents * 100)}% of the way there`} /><Detail label="Left to save" value={money(goal.targetCents - goal.savedCents)} /><Detail label="Available to set aside" value={money(available)} /></View>
    <Text style={[t.muted, { marginVertical: 22, textAlign: 'center' }]}>Part of your balance. Set aside for your future.</Text>
    <View style={[t.row, { gap: 10 }]}><Button title="Withdraw" variant="secondary" style={{ flex: 1 }} disabled={!goal.savedCents || live || !ready} onPress={() => setMode('withdraw')} /><Button title="Add money" style={{ flex: 1 }} disabled={available <= 0 || goal.savedCents >= goal.targetCents || live || !ready} onPress={() => setMode('add')} /></View>
    {!available && !live ? <View style={{ marginTop: 20 }}><Notice>Add money to your demo account before setting some aside.</Notice></View> : null}
    {live ? <Notice>Savings goals are a demo feature. Live funds are not reserved.</Notice> : null}<DemoNote />
    <Sheet visible={mode !== null} title={mode === 'add' ? 'A little closer.' : 'Here when you need it.'} onClose={() => { setMode(null); setError(''); setAmount(''); }}>
      <Text style={[t.muted, { marginBottom: 12 }]}>{mode === 'add' ? `${money(available)} available to set aside.` : `${money(goal.savedCents)} available in this goal.`}</Text>
      <TextInput accessibilityLabel="Savings amount" value={amount} onChangeText={setAmount} inputMode="decimal" placeholder="$0.00" placeholderTextColor={colors.muted} style={[t.card, { fontSize: 36, color: colors.ink, marginBottom: 18 }]} />
      {error ? <Notice error>{error}</Notice> : null}<Button title={mode === 'add' ? 'Set aside' : 'Return to available balance'} disabled={!valid || !ready || live} onPress={update} />
    </Sheet>
  </Screen>;
}
