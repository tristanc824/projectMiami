import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { themedStyles, useColors } from '../theme';
import { contacts, money, type Activity, type Contact } from '../domain/wallet';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: ColorValue }) {
  const { colors } = useColors();
  return <Ionicons name={name} size={size} color={typeof color === 'string' ? color : colors.ink} accessible={false} aria-hidden />;
}
export function Brand({ small = false, light = false }: { small?: boolean; light?: boolean }) {
  const { colors, styles: t } = useColors();
  return <View style={[t.row, { gap: 7 }]}><Icon name="shield-checkmark" size={small ? 29 : 35} color={colors.accent} /><Text style={{ fontSize: small ? 26 : 32, fontWeight: '800', letterSpacing: -1.2, color: light ? colors.white : colors.ink }}>Guard</Text></View>;
}
export function Button({ title, onPress, icon, variant = 'primary', disabled, loading, testID, style }: {
  title: string; onPress: () => void; icon?: IconName; variant?: 'primary' | 'secondary' | 'light'; disabled?: boolean; loading?: boolean; testID?: string; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useColors();
  const s = useS();
  const foreground = variant === 'primary' ? colors.white : variant === 'secondary' ? colors.ink : colors.accent;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || loading }} testID={testID}
    disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [s.button, variant === 'secondary' ? s.secondary : variant === 'light' ? s.light : s.primary, style, { opacity: disabled ? 0.45 : pressed ? 0.78 : 1 }]}>
    {loading ? <ActivityIndicator color={foreground} /> : icon ? <Icon name={icon} color={foreground} size={19} /> : null}
    <Text style={{ color: foreground, fontWeight: '700', fontSize: 17, letterSpacing: -0.35 }}>{title}</Text>
  </Pressable>;
}
export function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const s = useS();
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [s.iconButton, { opacity: pressed ? 0.6 : 1 }]}><Icon name={icon} size={21} /></Pressable>;
}
export function Avatar({ contact, size = 52 }: { contact: Contact; size?: number }) {
  const { colors } = useColors();
  return <View style={{ height: size, width: size, borderRadius: size / 2, backgroundColor: colors.soft, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.dash, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.ink, fontSize: size * 0.3, fontWeight: '600', textAlign: 'center' }}>{contact.initials}</Text></View>;
}
export function Pill({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  const { colors } = useColors();
  return <View style={{ backgroundColor: dark ? '#FFFFFF1A' : colors.mintLight, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20 }}><Text style={{ color: dark ? colors.mint : colors.green, fontSize: 11, fontWeight: '700' }}>{children}</Text></View>;
}
export function DemoNote({ compact = false }: { compact?: boolean }) {
  const { colors, styles: t } = useColors();
  return <View style={[t.row, { gap: 7, justifyContent: 'center', paddingVertical: compact ? 3 : 14 }]}><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.amber }} /><Text style={[t.muted, { fontSize: 11 }]}>Demo mode · No real funds</Text></View>;
}
/** Height of the floating tab dock; scroll content must clear it plus the home indicator. */
export const DOCK_HEIGHT = 76;
export function Screen({ children, title, subtitle, back = false, scroll = true, trailing }: { children?: ReactNode; title?: string; subtitle?: string; back?: boolean; scroll?: boolean; trailing?: ReactNode }) {
  const { styles: t } = useColors();
  const s = useS();
  const insets = useSafeAreaInsets();
  const content = <View style={s.content}>
    {back ? <View style={[t.between, { marginBottom: 18 }]}><IconButton icon="arrow-back" label="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} /><Brand small /><View style={{ width: 44 }} /></View> : null}
    {title ? <View style={[t.between, { marginBottom: 22 }]}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={t.title}>{title}</Text>{subtitle ? <Text style={[t.muted, { marginTop: 5 }]}>{subtitle}</Text> : null}</View>{trailing}</View> : null}
    {children}
  </View>;
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.screen}>{scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: back ? 36 : DOCK_HEIGHT + Math.max(insets.bottom, 16) + 24 }} showsVerticalScrollIndicator={false}>{content}</ScrollView> : content}</SafeAreaView>;
}
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { colors, styles: t } = useColors();
  return <View style={[t.between, { marginBottom: 16 }]}><Text style={t.heading}>{title}</Text>{action && onAction ? <Pressable accessibilityRole="button" onPress={onAction} hitSlop={12}><Text style={{ color: colors.green, fontSize: 13, fontWeight: '600' }}>{action} <Text>↗</Text></Text></Pressable> : null}</View>;
}
export function ActivityRow({ item }: { item: Activity }) {
  const { colors } = useColors();
  const s = useS();
  const contact = contacts.find(c => c.id === item.contactId);
  const incoming = item.kind === 'add' || item.kind === 'receive';
  return <Pressable onPress={() => router.push({ pathname: '/receipt', params: { id: item.id } })} accessibilityRole="button" accessibilityLabel={`${item.name}, ${incoming ? 'received' : 'sent'} ${money(item.amountCents)}, view receipt`} style={({ pressed }) => [s.activityRow, { opacity: pressed ? 0.65 : 1 }]}>
    {contact ? <Avatar contact={contact} size={44} /> : <View style={[s.activityIcon, { backgroundColor: incoming ? colors.mintLight : colors.blue }]}><Icon name={incoming ? 'add' : 'arrow-up-right-box-outline'} size={20} color={colors.green} /></View>}
    <View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.ink, fontWeight: '600', fontSize: 14 }}>{item.name}</Text><Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>{item.note}</Text></View>
    <View style={{ alignItems: 'flex-end', gap: 5 }}><Text style={{ color: incoming ? colors.green : colors.ink, fontWeight: '700', fontSize: 14 }}>{incoming ? '+' : '−'}{money(item.amountCents)}</Text><Text style={{ color: colors.muted, fontSize: 10 }}>Demo · {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text></View>
  </Pressable>;
}
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  const { colors } = useColors();
  return <View accessibilityRole={error ? 'alert' : undefined} style={{ padding: 15, borderRadius: 16, backgroundColor: error ? colors.dangerBg : colors.mintLight, flexDirection: 'row', gap: 10 }}><Icon name={error ? 'alert-circle-outline' : 'information-circle-outline'} size={19} color={error ? colors.danger : colors.green} /><Text style={{ color: error ? colors.danger : colors.green, fontSize: 13, lineHeight: 19, flex: 1 }}>{children}</Text></View>;
}
export function Detail({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  const { colors, styles: t } = useColors();
  return <View style={[t.between, { gap: 16, paddingVertical: 10 }]}><Text style={t.muted}>{label}</Text><Text style={{ color: colors.ink, fontWeight: strong ? '700' : '500', fontSize: 14, textAlign: 'right', flexShrink: 1 }}>{value}</Text></View>;
}
export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  const { colors, styles: t } = useColors();
  const [open, setOpen] = useState(false);
  return <View><Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={[t.between, { minHeight: 50 }]}><Text style={{ color: colors.green, fontWeight: '600', fontSize: 14 }}>{title}</Text><Icon name={open ? 'chevron-up' : 'chevron-down'} size={17} /></Pressable>{open ? children : null}</View>;
}
const useS = themedStyles(colors => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'web' ? 28 : 12, paddingBottom: 16 },
  button: { minHeight: 58, borderRadius: 32, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 9, paddingHorizontal: 22 },
  primary: { backgroundColor: colors.green }, secondary: { backgroundColor: colors.soft }, light: { backgroundColor: colors.mint },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 12 },
  activityIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
}));
