import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, View, useWindowDimensions } from 'react-native';
import { Text } from '../../components/Text';
import { DollarComparison, NestMark } from '../../components/NestArtwork';
import { ActivityRow, Avatar, Brand, DemoNote, Icon, Notice, Pill, Screen, SectionHeader, type IconName } from '../../components/ui';
import { contacts, DEMO_ARS_RATE, money } from '../../domain/wallet';
import { useExperience } from '../../state/ExperienceProvider';
import { useIsLive, useLive } from '../../state/live';
import { useWallet } from '../../state/WalletProvider';
import { themedStyles, useColors } from '../../theme';

function Action({ icon, label, accessibilityLabel, primary, onPress }: { icon: IconName; label: string; accessibilityLabel?: string; primary?: boolean; onPress: () => void }) {
  const { colors, styles: t } = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress} style={({ pressed }) => [t.row, { flex: 1, justifyContent: 'center', minHeight: 58, gap: 8, borderRadius: 30, backgroundColor: primary ? colors.ink : colors.surface, opacity: pressed ? .7 : 1 }]}>
    <Icon name={icon} size={20} color={primary ? colors.background : colors.ink} /><Text style={{ color: primary ? colors.background : colors.ink, fontSize: 15, fontWeight: '600' }}>{label}</Text>
  </Pressable>;
}

export default function HomeScreen() {
  const { colors, styles: t } = useColors();
  const s = useS();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { wallet, ready, storageWarning } = useWallet();
  const experience = useExperience();
  const live = useIsLive();
  const { problem, activityReady } = useLive();
  if (!experience.ready) return <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}><ActivityIndicator color={colors.green} /></View>;
  if (!experience.hasEntered && !live) return <Redirect href="/sign-in" />;
  const [whole, fraction] = money(wallet.balanceCents).split('.');
  const amountSize = Math.min(58, (Math.min(width, 620) - 96) / (.54 * money(wallet.balanceCents).length));
  const pesos = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(wallet.balanceCents / 100 * DEMO_ARS_RATE);
  return <Screen>
    <View style={[t.between, { marginBottom: 22 }]}>
      <Brand /><Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/account')}><Avatar contact={{ id: 'self', initials: '' } as typeof contacts[number]} size={42} /></Pressable>
    </View>
    <View style={s.balanceCard}>
      <View style={t.between}><Text style={t.muted}>Balance</Text><Pill>{live ? 'Test dollars' : 'Demo account'}</Pill></View>
      {ready ? <Text testID="home-balance" adjustsFontSizeToFit numberOfLines={1} minimumFontScale={.6} style={[s.amount, { fontSize: amountSize }]}>{whole}<Text style={[s.cents, { fontSize: amountSize * .66 }]}>.{fraction}</Text></Text> : <ActivityIndicator color={colors.green} />}
      <DollarComparison />
      <View style={[t.between, { gap: 8 }]}><Text style={s.chartLegend}><Text style={{ color: colors.green }}>In dollars</Text> · <Text style={{ color: colors.muted }}>in pesos</Text></Text><Text style={t.muted}>Illustration</Text></View>
      <View style={{ gap: 8, marginTop: 16, flexDirection: 'row', flexWrap: 'wrap' }}>
        <View style={s.held}><Icon name="leaf-outline" size={14} color={colors.green} /><Text style={{ fontSize: 13, color: colors.green, fontWeight: '500' }}>US dollars</Text></View>
        <View style={s.local}><Text style={{ color: colors.ink, fontSize: 13 }}>≈ ARS {pesos}</Text></View>
      </View>
      <Text style={[t.muted, { marginTop: 8 }]}>ARS shown at an example rate.</Text>
    </View>
    <View style={[t.row, { gap: 10, marginTop: 18, marginBottom: 30 }]}>
      <Action icon="arrow-forward" label="Send" accessibilityLabel="Send money" primary onPress={() => router.push('/send')} />
      <Action icon="add" label="Add" accessibilityLabel="Add money" onPress={() => router.push({ pathname: '/money', params: { mode: 'add' } })} />
      <Action icon="arrow-down" label="Receive" onPress={() => router.push('/request')} />
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Talk to Nest" onPress={() => router.push('/voice')} style={[t.card, { marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }]}><Icon name="mic-outline" size={24} /><View style={{ flex: 1 }}><Text style={t.heading}>Talk to Nest</Text><Text style={t.muted}>Speak a payment. Review before sending.</Text></View><Icon name="chevron-forward" size={18} /></Pressable>
    {live && !activityReady && !problem ? <Text testID="activity-loading" style={[t.muted, { marginBottom: 12 }]}>Loading recent payments…</Text> : null}
    <SectionHeader title="Activity" action="See all" onAction={() => router.push('/activity')} />
    <View style={[t.card, { paddingVertical: 4 }]}>{wallet.activity.length ? wallet.activity.slice(0, 3).map((item, i) => <View key={item.id}>{i ? <View style={t.divider} /> : null}<ActivityRow item={item} /></View>) : <View style={{ paddingVertical: 22, gap: 8 }}><Text style={[t.heading, { fontSize: 18 }]}>Your next chapter starts here.</Text><Text style={t.muted}>{live ? 'Payments you make in this browser or device will appear here.' : 'Add a few demo dollars to try your first payment.'}</Text></View>}</View>
    <Pressable accessibilityRole="button" accessibilityLabel="Explore dollar savings" onPress={() => router.push('/save')} style={({ pressed }) => [s.story, { opacity: pressed ? .8 : 1 }]}>
      <View style={{ flex: 1, padding: 20, gap: 8 }}><View style={[t.row, { gap: 6 }]}><NestMark size={18} /><Text style={{ color: colors.green, fontSize: 13, fontWeight: '500' }}>A little peace of mind</Text></View><Text style={[t.heading, { fontSize: 23, lineHeight: 26 }]}>For everything{ '\n' }you’re growing.</Text><Text style={{ color: colors.green, fontSize: 13, fontWeight: '600', marginTop: 4 }}>Find your next goal ↗</Text></View>
      <Image source={require('../../../assets/nest/kitchen.jpg')} resizeMode="cover" style={{ width: 110, height: '100%', minHeight: 180, borderTopLeftRadius: 70, borderBottomLeftRadius: 55 }} accessible={false} />
    </Pressable>
    {problem ? <View style={{ marginTop: 16 }}><Notice error>{problem}</Notice></View> : null}
    {storageWarning ? <View style={{ marginTop: 16 }}><Notice>Changes could not be saved on this device.</Notice></View> : null}<DemoNote />
  </Screen>;
}
const useS = themedStyles(colors => ({
  balanceCard: { backgroundColor: colors.surface, borderRadius: 28, padding: 22 },
  amount: { color: colors.ink, fontSize: 58, lineHeight: 70, letterSpacing: -2.5, fontWeight: '600', fontVariant: ['tabular-nums'], marginTop: 8 },
  cents: { color: colors.muted, fontSize: 38, letterSpacing: -1.4 },
  chartLegend: { fontSize: 13, color: colors.muted },
  held: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.mint, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 },
  local: { backgroundColor: colors.blue, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 },
  newPerson: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  story: { marginTop: 24, backgroundColor: colors.mint, borderRadius: 28, overflow: 'hidden', flexDirection: 'row', minHeight: 180 },
}));
