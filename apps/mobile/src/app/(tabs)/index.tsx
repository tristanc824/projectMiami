import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { Text } from '../../components/Text';
import { ActivityRow, DemoNote, Icon, Notice, Screen, type IconName } from '../../components/ui';
import { money } from '../../domain/wallet';
import { useExperience } from '../../state/ExperienceProvider';
import { useIsLive, useLive } from '../../state/live';
import { useWallet } from '../../state/WalletProvider';
import { themedStyles, useColors } from '../../theme';

// Home dashboard: native system type scale on an 8pt grid.

const lockImage = require('../../../assets/home/family-lock.png');

function QuickAction({ icon, label, accessibilityLabel, onPress }: { icon: IconName; label: string; accessibilityLabel?: string; onPress: () => void }) {
  const { colors } = useColors();
  const s = useS();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress} style={({ pressed }) => [s.action, { opacity: pressed ? .6 : 1 }]}>
    <View style={s.actionTile}><Icon name={icon} size={22} color={colors.ink} /></View>
    <Text numberOfLines={1} style={s.actionLabel}>{label}</Text>
  </Pressable>;
}

function SectionTitle({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  const { colors } = useColors();
  const s = useS();
  return <View style={[s.between, { marginBottom: 16 }]}>
    <Text accessibilityRole="header" style={s.sectionTitle}>{title}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} hitSlop={12} style={[s.row, { gap: 2 }]}><Text style={s.link}>{action}</Text><Icon name="chevron-forward" size={14} color={colors.accent} /></Pressable>
  </View>;
}

/** Solana's three-bar mark, drawn in code so it stays crisp at any size. */
function SolanaMark() {
  return <View accessible={false} style={{ gap: 1.5 }}>
    {[0, 1, 2].map(bar => <LinearGradient key={bar} colors={['#9945FF', '#14F195']} start={{ x: 0, y: .5 }} end={{ x: 1, y: .5 }} style={{ width: 10, height: 2, borderRadius: 1, transform: [{ skewX: bar === 1 ? '25deg' : '-25deg' }] }} />)}
  </View>;
}

export default function HomeScreen() {
  const { colors } = useColors();
  const s = useS();
  const router = useRouter();
  const { wallet, ready, storageWarning } = useWallet();
  const experience = useExperience();
  const live = useIsLive();
  const { problem } = useLive();
  const goal = wallet.goals[0];
  if (!experience.ready) return <View style={s.loading}><ActivityIndicator color={colors.accent} /></View>;
  if (!experience.hasEntered) return <Redirect href="/sign-in" />;
  const progress = Math.min(100, goal.fundedCents / goal.targetCents * 100);

  return <Screen>
    {/* Header */}
    <View style={[s.between, { marginBottom: 24 }]}>
      <View style={[s.row, { gap: 8 }]}>
        <Icon name="shield-checkmark" size={22} color={colors.accent} />
        <Text accessibilityRole="header" style={s.logo}>Guard</Text>
        <View style={s.badge}><View style={s.badgeDot} /><Text style={s.badgeLabel}>{live ? 'Devnet' : 'Demo'}</Text></View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/account')} hitSlop={4} style={({ pressed }) => [s.iconButton, { opacity: pressed ? .6 : 1 }]}><Icon name="settings-outline" size={20} color={colors.ink} /></Pressable>
    </View>

    {/* Balance */}
    <Text style={s.secondary}>Welcome back.</Text>
    <View style={[s.between, { marginTop: 4 }]}>
      <Text style={s.balanceTitle}>Your balance</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Currency: USDC" style={({ pressed }) => [s.currency, { opacity: pressed ? .6 : 1 }]}>
        <View style={s.coin}><Text style={s.coinSymbol}>$</Text></View>
        <Text style={s.currencyText}>USDC</Text>
        <Icon name="chevron-down" size={12} color={colors.muted} />
      </Pressable>
    </View>
    {ready ? <Text testID="home-balance" adjustsFontSizeToFit numberOfLines={1} minimumFontScale={.7} style={s.amount}>{money(wallet.balanceCents)}</Text> : <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />}
    <View style={[s.row, { gap: 6, flexWrap: 'wrap' }]}>
      <Text style={s.secondary}>Digital dollars on Solana</Text><SolanaMark />
      <Text style={s.secondary}>·</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Preview balance" onPress={() => router.push('/activity')} hitSlop={8}><Text style={s.link}>Preview balance</Text></Pressable>
    </View>

    {/* Quick actions — equal visual weight */}
    <View style={s.actions}>
      <QuickAction icon="add" label="Add" accessibilityLabel="Add money" onPress={() => router.push({ pathname: '/money', params: { mode: 'add' } })} />
      <QuickAction icon="paper-plane-outline" label="Send" accessibilityLabel="Send money" onPress={() => router.push('/send')} />
      <QuickAction icon="download-outline" label="Request" onPress={() => router.push('/request')} />
      <QuickAction icon="business-outline" label="Withdraw" accessibilityLabel="Withdraw money" onPress={() => router.push({ pathname: '/money', params: { mode: 'withdraw' } })} />
    </View>

    {/* Remittance product card */}
    <Pressable accessibilityRole="button" accessibilityLabel="Explore sending money home" onPress={() => router.push('/send')} style={({ pressed }) => [s.promo, { opacity: pressed ? .85 : 1 }]}>
      <View pointerEvents="none" style={s.rings}>{[184, 136, 88].map(size => <View key={size} style={[s.ring, { width: size, height: size, borderRadius: size / 2 }]} />)}</View>
      <View style={s.promoCopy}>
        <Text style={s.promoEyebrow}>Family protection</Text>
        <Text style={s.promoTitle}>Protect what matters.</Text>
        <Text numberOfLines={2} style={s.promoBody}>A safer, faster way to send money home.</Text>
        <View style={[s.row, { gap: 4, marginTop: 12 }]}><Text style={s.link}>Start a transfer</Text><Icon name="arrow-forward" size={14} color={colors.accent} /></View>
      </View>
      <Image source={lockImage} accessible={false} resizeMode="contain" style={s.promoArt} />
    </Pressable>

    {/* Family goal */}
    <Pressable accessibilityRole="button" accessibilityLabel="View family requests" onPress={() => router.push('/family')} style={({ pressed }) => [s.goal, { opacity: pressed ? .85 : 1 }]}>
      <View style={[s.row, { gap: 12 }]}>
        <View style={s.goalIcon}><Icon name="school-outline" color={colors.accent} size={20} /></View>
        <View style={{ flex: 1 }}><Text style={s.caption}>Family goal</Text><Text style={s.goalName}>{goal.name}</Text></View>
        <Icon name="chevron-forward" size={16} color={colors.muted} />
      </View>
      <View style={s.track}><View style={[s.progress, { width: `${progress}%` }]} /></View>
      <View style={s.between}><Text style={s.goalAmount}>{money(goal.fundedCents)} <Text style={s.secondary}>of {money(goal.targetCents)}</Text></Text><Text style={s.goalAmount}>{Math.round(progress)}%</Text></View>
    </Pressable>

    {/* Activity */}
    <View style={{ marginTop: 32 }}>
      <SectionTitle title="Recent activity" action="See all" onAction={() => router.push('/activity')} />
      {wallet.activity.slice(0, 3).map(item => <ActivityRow key={item.id} item={item} />)}
    </View>
    {problem ? <View style={{ marginTop: 16 }}><Notice error>{problem}</Notice></View> : null}
    {storageWarning ? <View style={{ marginTop: 16 }}><Notice>Changes are available for this session, but could not be saved on this device.</Notice></View> : null}
    <DemoNote />
  </Screen>;
}

const useS = themedStyles(colors => ({
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Type scale
  logo: { fontSize: 20, fontWeight: '700', letterSpacing: -.4, color: colors.ink },
  secondary: { fontSize: 13, lineHeight: 18, color: colors.muted },
  balanceTitle: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: colors.ink },
  amount: { fontSize: 40, lineHeight: 48, fontWeight: '700', letterSpacing: -1.2, color: colors.ink, fontVariant: ['tabular-nums'], marginTop: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600', color: colors.ink },
  link: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.accent },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500', color: colors.muted },
  // Header
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: colors.soft, marginLeft: 4 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  badgeLabel: { fontSize: 11, fontWeight: '600', color: colors.muted },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  // Balance
  currency: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingLeft: 6, paddingRight: 10, borderRadius: 16, backgroundColor: colors.soft },
  coin: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  coinSymbol: { fontSize: 11, lineHeight: 13, fontWeight: '700', color: colors.white },
  currencyText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  // Actions
  actions: { flexDirection: 'row', gap: 8, marginTop: 24 },
  action: { flex: 1, alignItems: 'center', gap: 8 },
  actionTile: { width: '100%', height: 56, borderRadius: 16, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, lineHeight: 16, fontWeight: '500', color: colors.ink },
  // Promo
  promo: { marginTop: 32, paddingVertical: 16, paddingLeft: 16, paddingRight: 8, borderRadius: 20, backgroundColor: colors.mintLight, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Rings sit centred behind the lock artwork.
  rings: { position: 'absolute', right: -32, top: '50%', marginTop: -92, width: 184, height: 184, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1, borderColor: colors.accent, opacity: .12 },
  promoCopy: { flex: 1 },
  promoEyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: colors.accent, marginBottom: 4 },
  promoArt: { width: 120, height: 120 },
  promoTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: colors.ink },
  promoBody: { fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 4 },
  // People
  peopleScroll: { marginHorizontal: -24 },
  peopleContent: { paddingHorizontal: 24, gap: 16 },
  person: { width: 64, alignItems: 'center' },
  personName: { fontSize: 12, lineHeight: 16, fontWeight: '500', color: colors.ink, marginTop: 8 },
  personMeta: { fontSize: 11, lineHeight: 14, color: colors.muted, marginTop: 2 },
  addPerson: { width: 56, height: 56, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.dash, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  // Goal
  goal: { marginTop: 32, padding: 16, borderRadius: 20, backgroundColor: colors.soft },
  goalIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  goalName: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: colors.ink, marginTop: 2 },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.track, marginTop: 16, marginBottom: 8, overflow: 'hidden' },
  progress: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
  goalAmount: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.ink },
}));
