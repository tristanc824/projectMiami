import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/Text';
import { Avatar, Brand, Button, DemoNote, Detail, Disclosure, Icon, Notice, type IconName, Pill, Screen } from '../../components/ui';
import { authConfigured, restoreSession, signIn, signOut, type SessionProfile } from '../../services/auth';
import { formatPhone } from '../../services/dat';
import { useLive } from '../../state/live';
import { useTheme, type ThemePreference } from '../../state/ThemeProvider';
import { useWallet } from '../../state/WalletProvider';
import { contacts } from '../../domain/wallet';
import { useColors } from '../../theme';

const appearanceOptions: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

export default function AccountScreen() {
  const { colors, styles: t } = useColors();
  const router = useRouter();
  const { reset } = useWallet();
  const { preference, setPreference } = useTheme();
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    let active = true;
    void restoreSession().then(value => { if (active) setProfile(value); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const live = useLive();
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
  return <Screen title="You" subtitle="Make yourself at home.">
    <View style={[t.card, { alignItems: 'center', paddingVertical: 30, gap: 12 }]}><Avatar contact={{ ...contacts[0], id: 'ana', initials: 'AM' }} size={76} />{signedInLive
      ? <><Text style={t.heading}>{formatPhone(live.phone) || 'Signed in'}</Text><Text selectable style={t.muted}>{live.address ? `${live.address.slice(0, 6)}…${live.address.slice(-6)}` : 'Setting up your wallet…'}</Text><Pill>Self-custody wallet · Solana devnet</Pill></>
      : <><Text style={t.heading}>{profile?.name || 'Your Nest'}</Text><Text style={t.muted}>{profile?.email || 'A little more freedom, every day.'}</Text><Pill>{profile ? 'Signed in with Auth0' : 'Demo profile'}</Pill></>}</View>
    <View style={{ marginTop: 18, gap: 10 }}><Button title="Saved contacts" variant="secondary" icon="people-outline" onPress={() => router.push('/contacts')} /><Button title="Your people" variant="secondary" icon="people-outline" onPress={() => router.push('/family')} /><Button title="Your activity" variant="secondary" icon="swap-vertical-outline" onPress={() => router.push('/activity')} /><Button title="Withdraw money" variant="secondary" icon="business-outline" onPress={() => router.push({ pathname: '/money', params: { mode: 'withdraw' } })} /><Button title="Apple Cash demo" variant="secondary" icon="logo-apple" onPress={() => router.push({ pathname: '/money', params: { mode: 'withdraw', destination: 'apple-cash' } })} /><Button title="Send without data" variant="secondary" icon="chatbubble-ellipses-outline" onPress={() => router.push('/text-payments')} /><Button title="Security and support" variant="secondary" icon="shield-checkmark-outline" onPress={() => router.push('/security')} /></View>
    <View style={[t.card, { marginTop: 18 }]}><View style={[t.row, { gap: 10, marginBottom: 6 }]}><Icon name="contrast-outline" color={colors.green} /><Text style={t.heading}>Appearance</Text></View><Text style={[t.muted, { marginBottom: 16 }]}>Choose light or dark, or follow your device.</Text>
      <View accessibilityRole="radiogroup" style={[t.row, { gap: 6, padding: 4, borderRadius: 24, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.line }]}>{appearanceOptions.map(option => { const selected = preference === option.value; return <Pressable key={option.value} testID={`appearance-${option.value}`} accessibilityRole="radio" accessibilityLabel={`${option.label} appearance`} accessibilityState={{ checked: selected }} onPress={() => setPreference(option.value)} style={({ pressed }) => [t.row, { flex: 1, justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: 20, backgroundColor: selected ? colors.green : 'transparent', opacity: pressed ? .7 : 1 }]}><Icon name={option.icon} size={16} color={selected ? colors.white : colors.muted} /><Text style={{ color: selected ? colors.white : colors.ink, fontSize: 13, fontWeight: '600' }}>{option.label}</Text></Pressable>; })}</View>
    </View>
    <View style={[t.card, { marginTop: 18 }]}><View style={[t.row, { gap: 10, marginBottom: 10 }]}><Icon name="log-in-outline" color={colors.green} /><Text style={t.heading}>Your account</Text></View><Text style={[t.muted, { marginBottom: 18 }]}>{liveAvailable ? signedInLive ? 'Your wallet holds real test USDC on Solana devnet. Only this phone number can sign in to it.' : 'Sign in with your phone number to use a real wallet on Solana devnet.' : authConfigured ? 'Sign in to try the connected Auth0 account experience. Money movement stays in demo mode.' : 'You’re exploring a preview. Account sign-in can be connected with Auth0 for the next build.'}</Text><Button title={liveAvailable ? signedInLive ? 'Sign out' : 'Sign in with phone' : profile ? 'Sign out' : 'Sign in with Auth0'} variant="secondary" loading={busy} onPress={() => { void authenticate(); }} />{error ? <View style={{ marginTop: 14 }}><Notice error>{error}</Notice></View> : null}</View>
    <Button style={{ marginTop: 14 }} title="Open sign-in screen" variant="secondary" onPress={() => router.push('/sign-in')} />
    <View style={[t.card, { marginTop: 18 }]}><Detail label="Asset" value="USDC digital dollars" /><Detail label="Network" value={signedInLive ? 'Solana devnet' : 'Local demo'} /><Detail label="Currency shown" value="USD" /><Detail label="Version" value="0.1.0 · Nest preview" /><View style={t.divider} /><Disclosure title="About this preview"><Text style={[t.muted, { paddingBottom: 12 }]}>Demo actions and savings goals are saved on this device. Connected accounts use test dollars on Solana devnet. Cash-outs are simulated. Digital dollars are not bank deposits, are not FDIC insured, and can be frozen by their issuer.</Text></Disclosure></View>
    <View style={[t.card, { marginTop: 18 }]}><Text style={t.heading}>Start fresh</Text><Text style={[t.muted, { marginTop: 7, marginBottom: 16 }]}>Reset your demo balance, savings goals, and activity on this device.</Text>{confirmReset ? <><Notice>This resets demo activity only. It does not sign you out of Auth0.</Notice><Button style={{ marginTop: 12 }} title="Reset demo data" onPress={() => { reset(); setConfirmReset(false); }} /><Button style={{ marginTop: 8 }} title="Keep my demo" variant="secondary" onPress={() => setConfirmReset(false)} /></> : <Button title="Reset demo" variant="secondary" onPress={() => setConfirmReset(true)} />}</View>
    <View style={{ alignItems: 'center', marginTop: 28, marginBottom: 4 }}><Brand small /><Text style={[t.muted, { marginTop: 10 }]}>Protect what matters.</Text></View><DemoNote />
  </Screen>;
}
