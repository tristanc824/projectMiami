import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, View, useWindowDimensions } from 'react-native';
import { Text } from '../../components/Text';
import { BalanceLine } from '../../components/NestArtwork';
import { ActivityRow, Avatar, Brand, DemoNote, Icon, Notice, Pill, Screen, SectionHeader, useDesktop, type IconName } from '../../components/ui';
import { money } from '../../domain/wallet';
import { useExperience } from '../../state/ExperienceProvider';
import { useIsLive, useLive } from '../../state/live';
import { useWallet } from '../../state/WalletProvider';
import { themedStyles, useColors } from '../../theme';

function Action({ icon, label, accessibilityLabel, primary, onCard, onPress }: { icon: IconName; label: string; accessibilityLabel?: string; primary?: boolean; onCard?: boolean; onPress: () => void }) {
  const { colors, styles: t } = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress} style={({ pressed }) => [t.row, { flex: 1, justifyContent: 'center', minHeight: 58, gap: 8, borderRadius: 30, backgroundColor: primary ? colors.ink : onCard ? colors.background : colors.surface, opacity: pressed ? .7 : 1 }]}>
    <Icon name={icon} size={20} color={primary ? colors.background : colors.ink} /><Text style={{ color: primary ? colors.background : colors.ink, fontSize: 15, fontWeight: '600' }}>{label}</Text>
  </Pressable>;
}

export default function HomeScreen() {
  const { colors, styles: t } = useColors();
  const s = useS();
  const { width } = useWindowDimensions();
  const desktop = useDesktop();
  const router = useRouter();
  const { wallet, ready, storageWarning } = useWallet();
  const experience = useExperience();
  const live = useIsLive();
  const { problem } = useLive();
  if (!experience.ready) return <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}><ActivityIndicator color={colors.green} /></View>;
  if (!experience.hasEntered && !live) return <Redirect href="/sign-in" />;
  const [whole, fraction] = money(wallet.balanceCents).split('.');
  const amountSize = desktop ? 76 : Math.min(58, (Math.min(width, 620) - 96) / (.54 * money(wallet.balanceCents).length));
  const recent = wallet.activity.slice(0, desktop ? 6 : 3);

  const actions = <View style={[t.row, { gap: 10 }]}>
    <Action icon="arrow-forward" label="Send" accessibilityLabel="Send money" primary onPress={() => router.push('/send')} />
    <Action icon="add" label="Add" accessibilityLabel="Add money" onCard={desktop} onPress={() => router.push({ pathname: '/money', params: { mode: 'add' } })} />
    <Action icon="arrow-down" label="Receive" onCard={desktop} onPress={() => router.push('/request')} />
  </View>;

  const balance = <View style={[s.balanceCard, desktop && { padding: 32 }]}>
    <View style={t.between}><Text style={t.muted}>Balance</Text><Pill>{live ? 'Test dollars' : 'Demo account'}</Pill></View>
    {ready ? <Text testID="home-balance" adjustsFontSizeToFit numberOfLines={1} minimumFontScale={.6} style={[s.amount, { fontSize: amountSize, lineHeight: amountSize * 1.2 }]}>{whole}<Text style={[s.cents, { fontSize: amountSize * .66 }]}>.{fraction}</Text></Text> : <ActivityIndicator color={colors.green} />}
    {ready ? <BalanceLine balanceCents={wallet.balanceCents} activity={wallet.activity} height={desktop ? 96 : 64} /> : null}
    <View style={[t.between, { marginTop: 8 }]}><Text style={t.muted}>Past month</Text><View style={s.held}><Icon name="leaf-outline" size={14} color={colors.green} /><Text style={{ fontSize: 13, color: colors.green, fontWeight: '500' }}>Held in US dollars</Text></View></View>
    {desktop ? <View style={{ marginTop: 28 }}>{actions}</View> : null}
  </View>;

  // An empty list next to a non-zero balance would look wrong, so it says where the money came from.
  const empty = <View style={{ paddingVertical: 22, gap: 8 }}><Text style={[t.heading, { fontSize: 18 }]}>{wallet.balanceCents > 0 ? 'Your payments will appear here.' : 'Your next chapter starts here.'}</Text><Text style={t.muted}>{wallet.balanceCents > 0 ? 'Money that arrived before you signed in may take a moment to show.' : live ? 'Your payments will appear here.' : 'Add a few demo dollars to try your first payment.'}</Text></View>;
  const activity = <View>
    <SectionHeader title="Activity" action="See all" onAction={() => router.push('/activity')} />
    <View style={[t.card, { paddingVertical: 4 }]}>{recent.length ? recent.map((item, i) => <View key={item.id}>{i ? <View style={t.divider} /> : null}<ActivityRow item={item} /></View>) : empty}</View>
  </View>;

  const notices = <>
    {problem ? <View style={{ marginTop: 16 }}><Notice error>{problem}</Notice></View> : null}
    {storageWarning ? <View style={{ marginTop: 16 }}><Notice>Changes could not be saved on this device.</Notice></View> : null}
  </>;

  if (desktop) return <Screen wide>
    <View style={{ flexDirection: 'row', gap: 32, alignItems: 'flex-start' }}>
      <View style={{ flex: 1.15 }}>{balance}{notices}<DemoNote /></View>
      <View style={{ flex: 1 }}>{activity}</View>
    </View>
  </Screen>;

  return <Screen>
    <View style={[t.between, { marginBottom: 22 }]}>
      <Brand /><Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/account')}><Avatar contact={{ initials: '' }} size={42} /></Pressable>
    </View>
    {balance}
    <View style={{ marginTop: 18, marginBottom: 30 }}>{actions}</View>
    {activity}
    {notices}<DemoNote />
  </Screen>;
}
const useS = themedStyles(colors => ({
  balanceCard: { backgroundColor: colors.surface, borderRadius: 28, padding: 22 },
  amount: { color: colors.ink, fontSize: 58, lineHeight: 70, letterSpacing: -2.5, fontWeight: '600', fontVariant: ['tabular-nums'], marginTop: 8 },
  cents: { color: colors.muted, fontSize: 38, letterSpacing: -1.4 },
  held: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.mint, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 },
}));
