import { PhoneContactButton } from '../components/PhoneContactButton';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { Avatar, Icon, Notice, Screen } from '../components/ui';
import { matchesRecipient, recentRecipients } from '../domain/contacts';
import type { Contact } from '../domain/wallet';
import { formatPhone } from '../services/dat';
import { useContacts } from '../state/ContactsProvider';
import { useWallet } from '../state/WalletProvider';
import { useColors } from '../theme';

export default function ContactsScreen() {
  const { colors, styles: t } = useColors();
  const { wallet } = useWallet();
  const saved = useContacts();
  const [query, setQuery] = useState('');
  const people = recentRecipients(wallet.activity, saved.contacts);
  const filtered = people.filter(person => matchesRecipient(person, query));
  return <Screen back title="Your contacts" subtitle="Familiar names. A little closer.">
    <View style={[t.card, t.row, { paddingVertical: 0, gap: 10, marginBottom: 20 }]}><Icon name="search-outline" size={20} color={colors.muted} /><TextInput accessibilityLabel="Search contacts" value={query} onChangeText={setQuery} placeholder="Name or phone number" placeholderTextColor={colors.muted} autoCorrect={false} style={[t.body, { minHeight: 54, flex: 1 }]} /></View>
    <PhoneContactButton onSelect={phone => router.push({ pathname: '/contact', params: { phone } })} />
    {filtered.length ? <View style={[t.card, { paddingVertical: 0 }]}>{filtered.map((person, i) => <View key={person.phone}>{i ? <View style={t.divider} /> : null}<Pressable accessibilityRole="button" accessibilityLabel={`Contact ${person.name}`} onPress={() => router.push({ pathname: '/contact', params: { phone: person.phone } })} style={[t.row, { gap: 14, paddingVertical: 18 }]}><Avatar contact={{ id: person.phone, initials: person.initials } as Contact} size={46} /><View style={{ flex: 1 }}><Text style={t.body}>{person.name}</Text><Text style={t.muted}>{formatPhone(person.phone)}</Text></View><Icon name="chevron-forward" size={18} color={colors.muted} /></Pressable></View>)}</View> : <View style={[t.card, { gap: 10 }]}><Text style={t.heading}>{query ? 'No matching contacts.' : 'Your people will appear here.'}</Text><Text style={t.muted}>{query ? 'Try a different name or number.' : 'After a payment, save their name from the receipt. Next time, find them here or in Send again.'}</Text></View>}
    {saved.problem ? <Notice error>{saved.problem}</Notice> : null}

  </Screen>;
}
