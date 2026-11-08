import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '../../components/Text';
import { Button, DemoNote, Icon, Notice, Screen, SectionHeader, Sheet } from '../../components/ui';
import { initialSavings, reservedCents } from '../../domain/savings';
import { money, parseAmount } from '../../domain/wallet';
import { useIsLive } from '../../state/live';
import { useWallet } from '../../state/WalletProvider';
import { useColors } from '../../theme';

export default function SaveScreen() {
  const { colors, styles: t } = useColors();
  const { wallet, save, ready } = useWallet();
  const live = useIsLive();
  const goals = wallet.savings ?? initialSavings();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const cents = parseAmount(target);
  const create = () => {
    if (!cents) return;
    try { save({ kind: 'create', id: `goal-${Date.now()}`, name, targetCents: cents }); setCreating(false); setName(''); setTarget(''); setError(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save this goal.'); }
  };
  return <Screen title="Save" subtitle="A little today. A little more tomorrow.">
    <View style={t.card}>
      <Text style={[t.heading, { fontSize: 18, lineHeight: 24 }]}>What $1,000 was worth{ '\n' }a year later.</Text>
      {[{ label: 'In dollars', value: '$1,000', fraction: 1, color: colors.green }, { label: 'In pesos', value: '$321', fraction: .321, color: '#5FA8D6' }].map(row => <View key={row.label} style={[t.row, { gap: 10, marginTop: 18 }]}><Text style={{ width: 66, color: colors.muted, fontSize: 13 }}>{row.label}</Text><View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.track, overflow: 'hidden' }}><View style={{ height: 10, width: `${row.fraction * 100}%`, backgroundColor: row.color, borderRadius: 5 }} /></View><Text style={{ width: 52, textAlign: 'right', color: colors.ink, fontSize: 15, fontWeight: '600' }}>{row.value}</Text></View>)}
      <Text style={[t.muted, { marginTop: 18 }]}>Argentina, 2023. Pesos lost purchasing power with 211.4% inflation (INDEC). Dollar value shown without interest.</Text>
    </View>
    <Text style={[t.muted, { marginTop: 20 }]}>{money(reservedCents(goals))} set aside from your {money(wallet.balanceCents)} balance.</Text>
    <View style={{ marginTop: 28 }}><SectionHeader title="Your goals" action="New goal" onAction={() => setCreating(true)} /></View>
    <View style={[t.card, { paddingVertical: 8 }]}>{goals.map((goal, i) => <View key={goal.id}>{i ? <View style={t.divider} /> : null}<Pressable accessibilityRole="button" accessibilityLabel={`Open ${goal.name}`} onPress={() => router.push({ pathname: '/goal', params: { id: goal.id } })} style={[t.row, { paddingVertical: 20, gap: 14 }]}>
      <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}><Icon name={goal.icon} color={colors.green} /></View>
      <View style={{ flex: 1 }}><View style={t.between}><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '500' }}>{goal.name}</Text><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '600' }}>{money(goal.savedCents)}</Text></View><View style={{ height: 6, borderRadius: 3, backgroundColor: colors.track, marginTop: 12, overflow: 'hidden' }}><View style={{ height: 6, borderRadius: 3, backgroundColor: colors.green, width: `${Math.min(100, goal.savedCents / goal.targetCents * 100)}%` }} /></View><Text style={[t.muted, { marginTop: 6 }]}>of {money(goal.targetCents)}</Text></View>
    </Pressable></View>)}</View>
    <Button title="New goal" icon="add" variant="secondary" onPress={() => setCreating(true)} style={{ marginTop: 18 }} />
    <View style={[t.card, { marginTop: 28, backgroundColor: colors.blue }]}><Text style={t.heading}>Saved stays saved.</Text><Text style={[t.muted, { marginTop: 8 }]}>Your goals stay in dollars. The local-currency value can change with the exchange rate.</Text></View>
    {live ? <View style={{ marginTop: 16 }}><Notice>Savings goals are a demo feature. Live test dollars are not moved or reserved.</Notice></View> : null}<DemoNote />
    <Sheet visible={creating} title="Something to save for" onClose={() => { setCreating(false); setError(''); }}>
      <Text style={[t.muted, { marginBottom: 8 }]}>Goal name</Text><TextInput accessibilityLabel="Goal name" value={name} onChangeText={setName} maxLength={40} placeholder="A place of our own" placeholderTextColor={colors.muted} style={[t.card, t.body, { marginBottom: 18 }]} />
      <Text style={[t.muted, { marginBottom: 8 }]}>Target in dollars</Text><TextInput accessibilityLabel="Goal target" value={target} onChangeText={setTarget} inputMode="decimal" placeholder="1,000" placeholderTextColor={colors.muted} style={[t.card, t.body, { marginBottom: 20 }]} />
      {error ? <Notice error>{error}</Notice> : null}<Button title="Create goal" disabled={!ready || !name.trim() || !cents || live} onPress={create} style={{ marginTop: 12 }} />
    </Sheet>
  </Screen>;
}
