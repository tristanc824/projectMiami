import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { ActivityRow, DemoNote, Icon, Screen } from '../components/ui';
import { useContacts } from '../state/ContactsProvider';
import { useWallet } from '../state/WalletProvider';
import { useColors } from '../theme';

export default function ActivityScreen() {
  const { colors, styles: t } = useColors();
  const { wallet } = useWallet();
  const { nameFor } = useContacts();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const items = wallet.activity.filter(item => `${nameFor(item.recipientPhone, item.name)} ${item.name} ${item.recipientPhone ?? ''} ${item.note}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'All' || (filter === 'Held' ? item.kind === 'hold' : filter === 'Sent' ? ['send', 'withdraw'].includes(item.kind) : ['add', 'receive'].includes(item.kind))));
  return <Screen title="Activity" subtitle="Every little moment, in one place." back>
    <View style={[t.row, { paddingHorizontal: 16, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, gap: 10, minHeight: 52 }]}><Icon name="search-outline" color={colors.muted} size={19} /><TextInput accessibilityLabel="Search activity" value={query} onChangeText={setQuery} placeholder="Search people or notes" placeholderTextColor={colors.muted} style={[t.body, { flex: 1, minHeight: 50 }]} /></View>
    <View style={[t.row, { gap: 9, flexWrap: 'wrap', marginTop: 18, marginBottom: 24 }]}>{['All', 'Sent', 'Received', 'Held'].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === filter }} onPress={() => setFilter(value)} style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 24, backgroundColor: value === filter ? colors.green : colors.surface, borderWidth: 1, borderColor: value === filter ? colors.green : colors.line }}><Text style={{ color: value === filter ? colors.white : colors.muted, fontSize: 13, fontWeight: '600' }}>{value}</Text></Pressable>)}</View>
    <View style={[t.card, { paddingVertical: 2, paddingHorizontal: 16 }]}>{items.length ? items.map((item, index) => <View key={item.id}>{index ? <View style={t.divider} /> : null}<ActivityRow item={item} /></View>) : <View style={{ paddingVertical: 40, alignItems: 'center', gap: 10 }}><Icon name="search-outline" color={colors.muted} size={30} /><Text style={t.heading}>Nothing here yet.</Text><Text style={t.muted}>{query || filter !== 'All' ? 'Try a different name or filter.' : 'Your payments will appear here.'}</Text></View>}</View><DemoNote />
  </Screen>;
}
