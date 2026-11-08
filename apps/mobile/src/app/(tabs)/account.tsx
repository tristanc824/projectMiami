import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '../../components/Text';
import { Brand, Button, DemoNote, Detail, Disclosure, Icon, Notice, type IconName, Pill, Screen, Sheet } from '../../components/ui';
import { authConfigured, restoreSession, signIn, signOut, type SessionProfile } from '../../services/auth';
import { formatPhone } from '../../services/dat';
import { useLive } from '../../state/live';
import { useTheme, type ThemePreference } from '../../state/ThemeProvider';
import { useWallet } from '../../state/WalletProvider';
import { EditableAvatar } from '../../components/EditableAvatar';
import { useProfile } from '../../state/ProfileProvider';
import { useColors } from '../../theme';

const appearanceOptions: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

export default function AccountScreen() {
  const { colors, styles: t } = useColors();
  const personal = useProfile();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const router = useRouter();
  const { reset } = useWallet();
  const { preference, setPreference } = useTheme();
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const live = useLive();
  useEffect(() => {
    if (live.status !== 'off') return;
    let active = true;
    void restoreSession().then(value => { if (active) setProfile(value); }).catch(() => undefined);
    return () => { active = false; };
  }, [live.status]);
  const liveAvailable = live.status !== 'off';
  const signedInLive = live.status === 'ready' || live.status === 'setting-up';
  const authenticate = async () => {
    setBusy(true); setError('');
    try {
      if (liveAvailable) { if (signedInLive) await live.logout(); else router.push('/sign-in'); }
      else if (profile) { await signOut(); setProfile(null); } else setProfile(await signIn());
    }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Sign-in could not be completed.'); }
    finally { setBusy(false); }
  };
  return <Screen title="You" subtitle="Your profile, preferences, and account.">
    <View style={[t.card, { alignItems: 'center', paddingVertical: 30, gap: 12 }]}><EditableAvatar contact={{ id: 'self' }} size={76} />{signedInLive
      ? <><Text accessibilityRole="header" style={t.heading}>{personal.name || formatPhone(live.phone) || 'Signed in'}</Text><Text selectable style={t.muted}>{live.address ? `${live.address.slice(0, 6)}…${live.address.slice(-6)}` : 'Setting up your wallet…'}</Text><Pill>Self-custody wallet · Solana devnet</Pill></>
      : <><Text accessibilityRole="header" style={t.heading}>{personal.name || profile?.name || 'Your Nest'}</Text><Text style={t.muted}>{profile?.email || 'A little more freedom, every day.'}</Text><Pill>{profile ? 'Signed in with Auth0' : 'Demo profile'}</Pill></>}</View>
    <Button title="Edit display name" icon="pencil-outline" variant="light" style={{ marginTop: 12 }} disabled={!personal.ready} onPress={() => { setName(personal.name); setError(''); setEditingName(true); }} />
    <View style={[t.card, { marginTop: 18 }]}><View style={[t.row, { gap: 10, marginBottom: 6 }]}><Icon name="contrast-outline" color={colors.green} /><Text style={t.heading}>Appearance</Text></View><Text style={[t.muted, { marginBottom: 16 }]}>Choose light or dark, or follow your device.</Text>
      <View accessibilityRole="radiogroup" style={[t.row, { gap: 6, padding: 4, borderRadius: 24, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.line }]}>{appearanceOptions.map(option => { const selected = preference === option.value; return <Pressable key={option.value} testID={`appearance-${option.value}`} accessibilityRole="radio" accessibilityLabel={`${option.label} appearance`} accessibilityState={{ checked: selected }} onPress={() => setPreference(option.value)} style={({ pressed }) => [t.row, { flex: 1, justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: 20, backgroundColor: selected ? colors.green : 'transparent', opacity: pressed ? .7 : 1 }]}><Icon name={option.icon} size={16} color={selected ? colors.white : colors.muted} /><Text style={{ color: selected ? colors.white : colors.ink, fontSize: 13, fontWeight: '600' }}>{option.label}</Text></Pressable>; })}</View>
    </View>
    <SettingsGroup title="Money"><SettingsRow title="Safe Holds" subtitle="Manage held payments, cancel, or release" icon="lock-closed-outline" onPress={() => router.push('/hold')} /><SettingsRow title="Your activity" subtitle="Payments and receipts" icon="swap-vertical-outline" onPress={() => router.push('/activity')} /><SettingsRow title="Withdraw money" subtitle="Choose a withdrawal destination" icon="business-outline" onPress={() => router.push({ pathname: '/money', params: { mode: 'withdraw' } })} /><SettingsRow title="Send without data" subtitle="Manage payments by text message" icon="chatbubble-ellipses-outline" onPress={() => router.push('/text-payments')} /></SettingsGroup>
    <SettingsGroup title="People"><SettingsRow title="Saved contacts" subtitle="Names and photos, saved on this device" icon="people-outline" onPress={() => router.push('/contacts')} /><SettingsRow title="Your people" subtitle="Explore shared demo goals" icon="heart-outline" onPress={() => router.push('/family')} /></SettingsGroup>
    <SettingsGroup title="Account">{signedInLive ? <SettingsRow title="App PIN" subtitle="Change your PIN or lock Nest" icon="key-outline" onPress={() => router.push('/pin')} /> : null}<SettingsRow title="Security and support" subtitle="Account protection and help" icon="shield-checkmark-outline" onPress={() => router.push('/security')} />
      <View style={{ paddingVertical: 16 }}><Text style={[t.muted, { marginBottom: 14 }]}>{liveAvailable ? signedInLive ? 'Signed in with your phone number. Your account uses test dollars on Solana devnet.' : 'Sign in with your phone number to use a test wallet.' : 'You’re exploring with demo dollars. No real money moves.'}</Text>
      <Button title={liveAvailable ? signedInLive ? 'Sign out' : 'Sign in with phone' : profile ? 'Sign out' : authConfigured ? 'Sign in with Auth0' : 'Open sign-in screen'} variant="secondary" loading={busy} onPress={() => { if (!liveAvailable && !profile && !authConfigured) router.push('/sign-in'); else void authenticate(); }} />
      {error && !editingName ? <View style={{ marginTop: 14 }}><Notice error>{error}</Notice></View> : null}</View>
    </SettingsGroup>
    <View style={[t.card, { marginTop: 18 }]}><Disclosure title="About Nest"><Detail label="Asset" value="USDC digital dollars" /><Detail label="Network" value={signedInLive ? 'Solana devnet' : 'Local demo'} /><Detail label="Currency shown" value="USD" /><Detail label="Version" value="0.1.0 · Nest preview" /><Text style={[t.muted, { paddingVertical: 12 }]}>Demo activity and profile changes are saved on this device. Connected accounts use test dollars on Solana devnet. Cash-outs are simulated. Digital dollars are not bank deposits, are not FDIC insured, and can be frozen by their issuer.</Text></Disclosure></View>
    <View style={[t.card, { marginTop: 18 }]}><Disclosure title="Demo tools"><Text style={[t.muted, { marginBottom: 16 }]}>Explore the preview or start a fresh demo. These tools never reset a connected wallet or your profile.</Text><Button title="Apple Cash demo" variant="secondary" icon="logo-apple" onPress={() => router.push({ pathname: '/money', params: { mode: 'withdraw', destination: 'apple-cash' } })} />
      {!signedInLive ? <View style={{ marginTop: 16 }}>{confirmReset ? <><Notice>Reset your demo balance, savings goals, and activity on this device?</Notice><Button style={{ marginTop: 12 }} title="Reset demo data" onPress={() => { reset(); setConfirmReset(false); }} /><Button style={{ marginTop: 8 }} title="Keep my demo" variant="secondary" onPress={() => setConfirmReset(false)} /></> : <Button title="Reset demo" variant="secondary" onPress={() => setConfirmReset(true)} />}</View> : null}
    </Disclosure></View>
    <View style={{ alignItems: 'center', marginTop: 28, marginBottom: 4 }}><Brand small /><Text style={[t.muted, { marginTop: 10 }]}>Protect what matters.</Text></View><DemoNote />
    <Sheet title="Your name" visible={editingName} onClose={() => { if (!busy) setEditingName(false); }}><Text style={[t.muted, { marginBottom: 16 }]}>Choose how your name appears on this device.</Text><TextInput accessibilityLabel="Display name" value={name} onChangeText={setName} maxLength={40} autoCapitalize="words" placeholder="Your name" placeholderTextColor={colors.muted} style={[t.body, { padding: 16, borderRadius: 18, backgroundColor: colors.surface, marginBottom: 16 }]} /><Button title="Save display name" loading={busy} onPress={() => { setBusy(true); void personal.update({ name }).then(() => setEditingName(false)).catch(() => setError('Could not save your name. Please try again.')).finally(() => setBusy(false)); }} />{error ? <Notice error>{error}</Notice> : null}</Sheet>
  </Screen>;
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const { styles: t } = useColors();
  return <View style={{ marginTop: 24 }}><Text accessibilityRole="header" style={[t.muted, { marginLeft: 16, marginBottom: 10, fontSize: 13, fontWeight: '600' }]}>{title}</Text><View style={[t.card, { paddingVertical: 0 }]}>{children}</View></View>;
}
function SettingsRow({ title, subtitle, icon, onPress }: { title: string; subtitle: string; icon: IconName; onPress: () => void }) {
  const { colors, styles: t } = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [t.row, { gap: 12, minHeight: 76, paddingVertical: 15, opacity: pressed ? .6 : 1 }]}><View style={{ backgroundColor: colors.mintLight, borderRadius: 14, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} color={colors.green} size={20} /></View><View style={{ flex: 1, gap: 4 }}><Text style={[t.body, { fontWeight: '500' }]}>{title}</Text><Text style={[t.muted, { fontSize: 12 }]}>{subtitle}</Text></View><Icon name="chevron-forward" size={17} color={colors.muted} /></Pressable>;
}
