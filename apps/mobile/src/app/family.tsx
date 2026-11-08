import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Text } from '../components/Text';
import { Avatar, Button, DemoNote, Icon, Notice, Pill, Screen, SectionHeader } from '../components/ui';
import { contacts, money } from '../domain/wallet';
import { useIsLive } from '../state/live';
import { useWallet } from '../state/WalletProvider';
import { useColors } from '../theme';

export default function FamilyScreen() {
  const { colors, styles: t } = useColors();
  const live = useIsLive();
  const { wallet } = useWallet();
  return <Screen title="Your people." subtitle="Home is the people you show up for." trailing={<Pill>Demo</Pill>} back>
    {live ? <Notice>These family requests are examples. They cannot be paid from a connected wallet.</Notice> : null}
    <View style={[t.card, { gap: 20, marginBottom: 30 }]}>{contacts.map(contact => <Pressable key={contact.id} disabled={live} accessibilityState={{ disabled: live }} onPress={() => router.push({ pathname: '/send', params: { contact: contact.id } })} accessibilityRole="button" accessibilityLabel={`Send to ${contact.name}`} style={[t.row, { gap: 13 }]}><Avatar contact={contact} /><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontWeight: '600', fontSize: 16 }}>{contact.name}</Text><Text style={t.muted}>{contact.location}</Text></View><View style={{ width: 36, height: 36, backgroundColor: colors.mintLight, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}><Icon name="arrow-up-outline" size={19} color={colors.green} /></View></Pressable>)}</View>
    <SectionHeader title="Good things, together" />
    {wallet.goals.map((goal, index) => {
      const remaining = goal.targetCents - goal.fundedCents;
      const contact = contacts.find(item => item.id === goal.contactId)!;
      return <View key={goal.id} style={[t.card, { marginBottom: 16, padding: 22 }]}><View style={t.between}><View style={{ width: 49, height: 49, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: index ? colors.lavender : colors.mintLight }}><Icon name={index ? 'airplane-outline' : 'school-outline'} color={colors.green} size={24} /></View><Pill>{remaining === 0 ? 'Goal reached' : 'Family request'}</Pill></View><Text style={[t.heading, { fontSize: 22, marginTop: 18 }]}>{goal.name}</Text><Text style={[t.muted, { marginTop: 6 }]}>{goal.description}</Text><View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, marginTop: 22, marginBottom: 12 }}><View style={{ height: 6, borderRadius: 3, width: `${Math.min(100, goal.fundedCents / goal.targetCents * 100)}%`, backgroundColor: colors.green }} /></View><View style={t.between}><Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>{money(goal.fundedCents)} <Text style={{ color: colors.muted, fontWeight: '400' }}>of {money(goal.targetCents)}</Text></Text><Text style={t.muted}>{Math.round(goal.fundedCents / goal.targetCents * 100)}%</Text></View><View style={[t.row, { marginTop: 18, marginBottom: 20, gap: 8 }]}><Avatar contact={contact} size={25} /><Text style={t.muted}>Requested by {contact.name} · sample request</Text></View><Button title={remaining === 0 ? 'Fully funded in demo' : 'Contribute'} variant="secondary" disabled={live || remaining === 0} onPress={() => router.push({ pathname: '/send', params: { contact: contact.id, goalId: goal.id } })} /></View>;
    })}<DemoNote />
  </Screen>;
}
