import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, useSyncExternalStore, type ComponentProps, type ReactNode } from 'react';
import { onSecurityGate, securityGateVisible } from '../services/presentation';
import { ActivityIndicator, Image, Modal, Platform, Pressable, StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { KeyboardFrame, KeyboardScroll, useKeyboardVisible } from './KeyboardForm';
import { NestMark } from './NestArtwork';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { themedStyles, useColors } from '../theme';
import { contacts, demoPhones, money, type Activity, type Contact } from '../domain/wallet';
import { useProfile } from '../state/ProfileProvider';
import { useContacts } from '../state/ContactsProvider';
import { useIsLive } from '../state/live';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: ColorValue }) {
  const { colors } = useColors();
  return <Ionicons name={name} size={size} color={typeof color === 'string' ? color : colors.ink} accessible={false} aria-hidden />;
}
export function Brand({ small = false, light = false }: { small?: boolean; light?: boolean }) {
  const { colors, styles: t } = useColors();
  return <View style={[t.row, { gap: 7 }]}><NestMark size={small ? 29 : 35} light={light} /><Text style={{ fontSize: small ? 26 : 32, fontWeight: '600', letterSpacing: -1.2, color: light ? colors.white : colors.ink }}>Nest</Text></View>;
}
export function Button({ title, onPress, icon, variant = 'primary', disabled, loading, testID, style, textColor }: {
  title: string; onPress: () => void; icon?: IconName; variant?: 'primary' | 'secondary' | 'light'; disabled?: boolean; loading?: boolean; testID?: string; style?: StyleProp<ViewStyle>; textColor?: string;
}) {
  const { colors } = useColors();
  const s = useS();
  const foreground = textColor ?? (variant === 'primary' ? colors.background : variant === 'secondary' ? colors.ink : colors.accent);
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
export function Avatar({ contact, size = 52 }: { contact: Pick<Contact, 'id'>; size?: number }) {
  const { colors } = useColors();
  const { photos } = useProfile();
  const [failed, setFailed] = useState('');
  const photo = photos[demoPhones[contact.id] ?? contact.id];
  return <View testID={`avatar-${contact.id}`} style={{ height: size, width: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
    {photo && failed !== photo ? <Image accessible={false} source={{ uri: photo }} onError={() => setFailed(photo)} resizeMode="cover" style={{ width: size, height: size }} /> : <Icon name="person-outline" color={colors.green} size={size * .45} />}
  </View>;
}
export function Pill({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  const { colors } = useColors();
  return <View style={{ backgroundColor: dark ? '#FFFFFF1A' : colors.mintLight, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20 }}><Text style={{ color: dark ? colors.mint : colors.green, fontSize: 13, fontWeight: '700' }}>{children}</Text></View>;
}
export function DemoNote({ compact = false }: { compact?: boolean }) {
  const { colors, styles: t } = useColors();
  const live = useIsLive();
  return <View style={[t.row, { gap: 7, justifyContent: 'center', paddingVertical: compact ? 3 : 14 }]}><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: live ? colors.accent : colors.amber }} /><Text style={[t.muted, { fontSize: 13 }]}>{live ? 'Solana devnet · Test dollars, no real money' : 'Demo mode · No real funds'}</Text></View>;
}
/** Height of the floating tab dock; scroll content must clear it plus the home indicator. */
export const DOCK_HEIGHT = 72;
export function Screen({ children, title, subtitle, back = false, scroll = true, trailing, footer, scrollResetKey }: { children?: ReactNode; title?: string; subtitle?: string; back?: boolean; scroll?: boolean; trailing?: ReactNode; footer?: ReactNode; scrollResetKey?: string }) {
  const { colors, styles: t } = useColors();
  const s = useS();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const content = <View style={s.content}>
    {back ? <View style={[t.between, { marginBottom: 18 }]}><IconButton icon="arrow-back" label="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} /><Brand small /><View style={{ width: 44 }} /></View> : null}
    {title ? <View style={[t.between, { marginBottom: 22 }]}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={t.title}>{title}</Text>{subtitle ? <Text style={[t.muted, { marginTop: 5 }]}>{subtitle}</Text> : null}</View>{trailing}</View> : null}
    {children}
  </View>;
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.screen}><KeyboardFrame offset={insets.top}>
    {scroll ? <KeyboardScroll key={scrollResetKey} contentContainerStyle={{ paddingBottom: footer || keyboardVisible ? 16 : back ? Math.max(insets.bottom, 16) + 24 : DOCK_HEIGHT + Math.max(insets.bottom, 16) + 24 }} showsVerticalScrollIndicator={false}>{content}</KeyboardScroll> : content}
    {footer ? <View style={{ width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 12), backgroundColor: colors.background }}>{footer}</View> : null}
  </KeyboardFrame></SafeAreaView>;
}
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { colors, styles: t } = useColors();
  return <View style={[t.between, { marginBottom: 16 }]}><Text style={t.heading}>{title}</Text>{action && onAction ? <Pressable accessibilityRole="button" onPress={onAction} hitSlop={12}><Text style={{ color: colors.green, fontSize: 13, fontWeight: '600' }}>{action}</Text></Pressable> : null}</View>;
}
export function ActivityRow({ item }: { item: Activity }) {
  const { colors } = useColors();
  const s = useS();
  const contact = contacts.find(c => c.id === item.contactId);
  const { nameFor } = useContacts();
  const displayName = nameFor(item.recipientPhone, contact?.name ?? item.name);
  const incoming = item.kind === 'add' || item.kind === 'receive';
  const status = item.status === 'pending' ? 'pending' : item.status === 'failed' ? 'failed' : item.status === 'expired' ? 'expired' : null;
  return <Pressable onPress={() => item.kind === 'hold' && item.holdState ? router.push({ pathname: '/hold', params: { state: item.holdState } }) : router.push({ pathname: '/receipt', params: { id: item.id } })} accessibilityRole="button" accessibilityLabel={`${displayName}, ${status || (item.kind === 'hold' ? 'held' : incoming ? 'received' : 'sent')} ${money(item.amountCents)}, view receipt`} style={({ pressed }) => [s.activityRow, { opacity: pressed ? 0.65 : 1 }]}>
    {contact ? <Avatar contact={contact} size={44} /> : <View style={[s.activityIcon, { backgroundColor: incoming ? colors.mintLight : colors.blue }]}><Icon name={incoming ? 'add' : 'arrow-up-right-box-outline'} size={20} color={colors.green} /></View>}
    <View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.ink, fontWeight: '600', fontSize: 14 }}>{displayName}</Text><Text numberOfLines={1} style={{ color: colors.muted, fontSize: 13 }}>{item.note}</Text></View>
    <View style={{ alignItems: 'flex-end', gap: 5 }}><Text style={{ color: incoming ? colors.green : colors.ink, fontWeight: '700', fontSize: 14 }}>{status ? '' : incoming ? '+' : '−'}{money(item.amountCents)}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{status ? status[0].toUpperCase() + status.slice(1) : item.live ? 'Devnet' : 'Demo'} · {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text></View>
  </Pressable>;
}
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  const { colors } = useColors();
  return <View accessibilityRole={error ? 'alert' : undefined} style={{ padding: 15, borderRadius: 20, backgroundColor: error ? colors.dangerBg : colors.mintLight, flexDirection: 'row', gap: 10 }}><Icon name={error ? 'alert-circle-outline' : 'information-circle-outline'} size={19} color={error ? colors.danger : colors.green} /><Text style={{ color: error ? colors.danger : colors.green, fontSize: 13, lineHeight: 19, flex: 1 }}>{children}</Text></View>;
}
export function Detail({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  const { colors, styles: t } = useColors();
  return <View style={[t.between, { gap: 16, paddingVertical: 10 }]}><Text style={[t.muted, { flexShrink: 1 }]}>{label}</Text><Text style={{ maxWidth: '65%', color: colors.ink, fontWeight: strong ? '700' : '500', fontSize: 14, textAlign: 'right', flexShrink: 1 }}>{value}</Text></View>;
}
export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  const { colors, styles: t } = useColors();
  const [open, setOpen] = useState(false);
  return <View><Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={[t.between, { minHeight: 50 }]}><Text style={{ color: colors.green, fontWeight: '600', fontSize: 14 }}>{title}</Text><Icon name={open ? 'chevron-up' : 'chevron-down'} size={17} /></Pressable>{open ? children : null}</View>;
}
const useS = themedStyles(colors => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'web' ? 24 : 12, paddingBottom: 16 },
  button: { minHeight: 58, borderRadius: 32, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 9, paddingHorizontal: 22 },
  primary: { backgroundColor: colors.ink }, secondary: { backgroundColor: colors.surface }, light: { backgroundColor: colors.mint },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 12 },
  activityIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
}));

export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const { colors, styles: t } = useColors();
  const insets = useSafeAreaInsets();
  const suspended = useSyncExternalStore(onSecurityGate, securityGateVisible, () => false);
  return <Modal visible={visible && !suspended} transparent animationType={suspended ? 'none' : 'slide'} onRequestClose={onClose}>
    <KeyboardFrame style={{ justifyContent: 'flex-end', backgroundColor: '#17201A66' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close sheet" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 620, maxHeight: '90%', alignSelf: 'center', backgroundColor: colors.background, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 24 }} />
        <View style={[t.between, { marginBottom: 20 }]}><Text accessibilityRole="header" style={[t.heading, { flex: 1 }]}>{title}</Text><IconButton icon="close" label="Dismiss" onPress={onClose} /></View>
        <KeyboardScroll showsVerticalScrollIndicator={false}>{children}</KeyboardScroll>
      </View>
    </KeyboardFrame>
  </Modal>;
}
