import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/Text';
import { Avatar, Button, DemoNote, Icon, Notice, Screen, Sheet, type IconName } from '../../components/ui';
import { contacts } from '../../domain/wallet';
import { useLive } from '../../state/live';
import { useColors } from '../../theme';

const protections: { title: string; subtitle: string; status: string; icon: IconName; detail: string }[] = [
  { title: 'Face ID', subtitle: 'Your face is your password.', status: 'Not set up', icon: 'scan-outline', detail: 'Biometric confirmation is part of the Nest design preview. This build uses the connected sign-in provider and does not yet confirm payments with Face ID.' },
  { title: 'Scam check', subtitle: 'A moment to think before you send.', status: 'Preview', icon: 'shield-checkmark-outline', detail: 'Scam checks are not connected in this build. Before sending, verify the number with someone you know. Never send money because someone is rushing you or promising a guaranteed return.' },
  { title: '24-hour undo', subtitle: 'More time when you pay someone new.', status: 'Preview', icon: 'arrow-undo-outline', detail: 'The mockups include a 24-hour hold for first payments to a new recipient. Escrow is not connected in this build. Completed devnet transfers cannot be undone.' },
  { title: 'Family safe word', subtitle: 'A small word. A little peace of mind.', status: 'Not set up', icon: 'key-outline', detail: 'This feature is a preview. Agree on a safe word with your family through a trusted channel. If a request feels unusual, call them on a number you already know before sending.' },
  { title: 'Trusted contact', subtitle: 'Someone in your corner.', status: 'Not set up', icon: 'heart-outline', detail: 'Trusted contact recovery is not connected yet. The people shown in the demo are sample contacts and cannot recover your account.' },
];

export default function SecurityScreen() {
  const { colors, styles: t } = useColors();
  const live = useLive();
  const [selected, setSelected] = useState<typeof protections[number] | null>(null);
  const [support, setSupport] = useState(false);
  const [error, setError] = useState('');
  return <Screen title="Security" subtitle="A little more peace of mind.">
    <View style={[t.row, { gap: 16, marginTop: 4, marginBottom: 4 }]}><View style={{ width: 56, height: 56, backgroundColor: colors.mint, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}><Icon name="shield-checkmark-outline" size={28} color={colors.green} /></View><View style={{ flex: 1 }}><Text style={[t.heading, { fontSize: 24, lineHeight: 28 }]}>Your money. Your say.</Text><Text style={[t.muted, { marginTop: 6 }]}>Know what’s protecting it.</Text></View></View>
    <View style={[t.card, { marginTop: 24, paddingVertical: 0 }]}>{protections.map((item, i) => <View key={item.title}>{i ? <View style={t.divider} /> : null}<Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, ${item.status}`} onPress={() => setSelected(item)} style={[t.row, { gap: 13, paddingVertical: 16 }]}>
      {item.title === 'Trusted contact' ? <Avatar contact={contacts[0]} size={38} /> : <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}><Icon name={item.icon} color={colors.green} size={20} /></View>}
      <View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '500' }}>{item.title}</Text><Text style={[t.muted, { marginTop: 4 }]}>{item.status}</Text></View><Icon name="chevron-forward" size={17} color={colors.muted} />
    </Pressable></View>)}</View>
    <View style={{ marginTop: 24, gap: 10 }}><Button title="Talk to a person" variant="secondary" icon="chatbubble-ellipses-outline" onPress={() => setSupport(true)} /><Button title={live.status === 'ready' ? 'Sign out of Nest' : 'Back to sign in'} variant="secondary" icon="lock-closed-outline" onPress={() => { void (async () => { try { if (live.status === 'ready') await live.logout(); router.push('/sign-in'); } catch { setError('Could not sign out. Please try again.'); } })(); }} /></View>
    {error ? <Notice error>{error}</Notice> : null}<DemoNote />
    <Sheet title={selected?.title ?? 'Protection'} visible={selected !== null} onClose={() => setSelected(null)}><Text style={[t.heading, { marginBottom: 12 }]}>{selected?.subtitle}</Text><Text style={[t.body, { marginBottom: 24 }]}>{selected?.detail}</Text><Button title="Got it" onPress={() => setSelected(null)} /></Sheet>
    <Sheet title="Here to help" visible={support} onClose={() => setSupport(false)}><Text style={[t.body, { marginBottom: 18 }]}>Human support is not connected in this preview. For a problem with a test payment, keep its reference from the receipt and contact the Nest demo team directly.</Text><Notice>Never share a sign-in code, private key, or recovery phrase.</Notice><Button title="View my activity" onPress={() => { setSupport(false); router.push('/activity'); }} style={{ marginTop: 20 }} /></Sheet>
  </Screen>;
}
