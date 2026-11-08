import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from './Text';
import { Avatar, Button, Icon, Notice, SectionHeader } from './ui';
import { recentRecipients, matchesRecipient } from '../domain/contacts';
import { contacts, type Activity, type Contact } from '../domain/wallet';
import { formatPhone, normalizePhone } from '../services/dat';
import { useContacts } from '../state/ContactsProvider';
import { useColors } from '../theme';

// Reserved fictional US numbers, used only by the local demo.
export const demoPhones: Record<string, string> = { mama: '+13055550101', diego: '+13055550102', camila: '+13055550103' };
export function RecipientPicker({ demo, activity, onSelect }: { demo: boolean; activity: Activity[]; onSelect: (phone: string, contactId?: string) => void }) {
  const { colors, styles: t } = useColors();
  const saved = useContacts();
  const [query, setQuery] = useState('');
  const phone = normalizePhone(query);
  const filtered = contacts.filter(c => `${c.name} ${c.fullName} ${c.location}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const people = recentRecipients(activity, saved.contacts);
  const recent = people.filter(person => matchesRecipient(person, query));
  return <>
    <View style={[t.row, { backgroundColor: colors.surface, borderRadius: 28, paddingHorizontal: 18, gap: 10, marginBottom: 24 }]}><Icon name="search-outline" color={colors.muted} size={20} /><TextInput accessibilityLabel="Search name or phone number" value={query} onChangeText={setQuery} placeholder="Name or phone number" placeholderTextColor={colors.muted} autoCorrect={false} returnKeyType="search" style={[t.body, { flex: 1, minHeight: 56 }]} /></View>
    {!query && people.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 18, paddingBottom: 24 }}>{people.slice(0, 6).map(person => <Pressable key={person.phone} accessibilityRole="button" accessibilityLabel={`Choose ${person.name}`} onPress={() => onSelect(person.phone)} style={{ width: 70, alignItems: 'center', gap: 9 }}><Avatar contact={{ id: person.phone, name: person.name, initials: person.initials } as Contact} size={58} /><Text numberOfLines={1} style={{ color: colors.ink, fontSize: 13 }}>{person.name}</Text></Pressable>)}</ScrollView> : null}
    {phone ? <View style={{ gap: 16, marginBottom: 24 }}><View style={[t.card, t.row, { gap: 12 }]}><Icon name="call-outline" color={colors.green} /><View style={{ flex: 1 }}><Text style={t.heading}>{saved.nameFor(phone, formatPhone(phone))}</Text><Text style={t.muted}>Check the number before sending.</Text></View></View><Button title="Continue" onPress={() => onSelect(phone)} /></View> : null}
    {recent.length ? <View style={{ marginBottom: 24 }}><SectionHeader title={query ? 'Matches' : 'Send again'} action="Contacts" onAction={() => router.push('/contacts')} /><View style={[t.card, { paddingVertical: 0 }]}>{recent.map((person, i) => <View key={person.phone}>{i ? <View style={t.divider} /> : null}<Pressable accessibilityRole="button" accessibilityLabel={`Pay ${person.name}`} onPress={() => onSelect(person.phone)} style={[t.row, { gap: 12, paddingVertical: 18 }]}><Avatar contact={{ id: person.phone, initials: person.initials } as Contact} size={44} /><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '500' }}>{person.name}</Text><Text style={[t.muted, { marginTop: 3 }]}>{person.paymentCount ? `${person.paymentCount} payment${person.paymentCount === 1 ? '' : 's'} · ${new Date(person.lastPaidAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : formatPhone(person.phone)}</Text></View><Icon name="chevron-forward" size={18} color={colors.muted} /></Pressable></View>)}</View></View> : null}
    {demo && !query ? <View style={[t.row, { gap: 24, marginBottom: 24 }]}>{contacts.map(contact => <Pressable key={contact.id} accessibilityRole="button" accessibilityLabel={`Choose ${contact.name}`} onPress={() => onSelect(demoPhones[contact.id], contact.id)} style={{ alignItems: 'center', gap: 10 }}><Avatar contact={contact} size={58} /><Text style={{ color: colors.ink, fontSize: 13, fontWeight: '500' }}>{contact.name}</Text></Pressable>)}</View> : null}
    {demo && filtered.length ? <><Text style={[t.muted, { marginBottom: 12 }]}>Your people · sample contacts</Text><View style={[t.card, { paddingVertical: 0 }]}>{filtered.map((contact, i) => <View key={contact.id}>{i ? <View style={t.divider} /> : null}<Pressable accessibilityRole="button" accessibilityLabel={`Select ${contact.name}`} onPress={() => onSelect(demoPhones[contact.id], contact.id)} style={[t.row, { gap: 14, paddingVertical: 19 }]}><Avatar contact={contact} size={46} /><View style={{ flex: 1 }}><Text style={{ fontSize: 16, color: colors.ink, fontWeight: '500' }}>{contact.name}</Text><Text style={[t.muted, { marginTop: 3 }]}>{contact.location}</Text></View><Icon name="chevron-forward" size={18} color={colors.muted} /></Pressable></View>)}</View></> : null}
    {query && !phone && !recent.length && (!demo || !filtered.length) ? <View style={{ marginBottom: 18 }}><Text style={t.heading}>No matching people.</Text><Text style={[t.muted, { marginTop: 8 }]}>Try a saved name or a full phone number.</Text></View> : null}
    {!phone ? <View style={{ marginTop: 24 }}><Notice>{demo ? 'Sample contacts use fictional numbers. Or enter any full phone number to try a demo payment.' : 'Enter the number they use for Nest, including the country code.'}</Notice></View> : null}
    {saved.problem ? <Notice error>{saved.problem}</Notice> : null}
  </>;
}
