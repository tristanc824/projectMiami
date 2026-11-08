import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { formatPhone, normalizePhone } from '../services/dat';
import { useLive } from '../state/live';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardFrame, KeyboardScroll } from '../components/KeyboardForm';
import { Brand, Button, Sheet } from '../components/ui';
import { signIn } from '../services/auth';
import { useExperience } from '../state/ExperienceProvider';
import { parsePaymentRequest } from '../domain/paymentRequest';

/*
 * Sign-in follows the pattern shared by PayPal, Venmo, Cash App, Revolut, Wise, Coinbase,
 * Robinhood, Mercury, Amex and Chase: logo top-left, one task headline, a narrow left-aligned
 * form that starts with the phone number, one primary button, a switch link, small print last.
 * On laptop-width screens a photo fills the left half (Robinhood / Revolut split layout).
 */
const C = { page: '#F6F4EF', ink: '#17201A', muted: '#5B665E', line: '#D8D2C6', moss: '#2F5D3A', field: '#FFFFFF' };

export default function SignInScreen() {
  const router = useRouter();
  const { paymentRequest } = useLocalSearchParams<{ paymentRequest?: string }>();
  const { enter } = useExperience();
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [mode, setMode] = useState<'login' | 'create'>('create');
  const live = useLive();
  // Live builds sign in by SMS with Privy; everywhere else the existing Auth0 flow is unchanged.
  const liveAvailable = live.status !== 'off';
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const enterApp = () => {
    enter();
    if (typeof paymentRequest === 'string') {
      try {
        const request = parsePaymentRequest(JSON.parse(paymentRequest));
        if (request) { router.dismissTo({ pathname: '/pay', params: request }); return; }
      } catch { /* Fall back to home if the return request is malformed. */ }
    }
    router.dismissTo('/');
  };
  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await work(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Sign-in could not be completed.'); }
    finally { setBusy(false); }
  };
  const requestCode = () => run(async () => { if (live.problem) throw new Error(live.problem); await live.sendCode(phone); setCode(''); setStep('code'); });
  const verify = () => run(async () => { await live.verifyCode(phone, code); enterApp(); });
  const legacySignIn = () => run(async () => { await signIn(); enterApp(); });

  if (live.status === 'ready' && typeof paymentRequest !== 'string') return <Redirect href="/" />;

  const headline = step === 'code' ? 'Check your texts' : mode === 'create' ? 'Open your Nest account' : 'Log in to Nest';
  const lead = step === 'code'
    ? `We sent a 6-digit code to ${formatPhone(normalizePhone(phone) ?? phone)}.`
    : 'Enter your phone number and we’ll text you a code. No password needed.';

  const form = <View style={s.form}>
    <Text accessibilityRole="header" style={[s.title, wide && s.titleWide]}>{headline}</Text>
    <Text style={s.lead}>{lead}</Text>
    {error ? <View accessibilityRole="alert" style={s.error}><Text style={s.errorText}>{error}</Text></View> : null}

    {live.status === 'setting-up' ? <View style={{ gap: 12 }}>
      <Text style={s.lead}>{live.problem || 'Finishing your wallet setup…'}</Text>
      <Button title="Sign out" variant="secondary" onPress={() => { void run(live.logout); }} />
    </View> : !liveAvailable ? <View style={{ gap: 12 }}>
      <Button title="Continue" loading={busy} onPress={() => { void legacySignIn(); }} style={s.primary} textColor="#FFFFFF" />
      <Button title="Explore the demo" variant="secondary" onPress={enterApp} style={s.secondary} textColor={C.ink} />
    </View> : step === 'phone' ? <View>
      <Text style={s.label}>Phone number</Text>
      <TextInput accessibilityLabel="Phone number" testID="live-phone" value={phone} onChangeText={setPhone} placeholder="+1 305 555 0142" placeholderTextColor="#9AA39C" keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" autoFocus={wide} style={s.input} />
      <Button title="Continue" loading={busy || live.status === 'loading'} disabled={phone.replace(/\D/g, '').length < 10} onPress={() => { void requestCode(); }} style={[s.primary, { marginTop: 16 }]} textColor="#FFFFFF" />
    </View> : <View>
      <Text style={s.label}>Verification code</Text>
      <TextInput accessibilityLabel="Verification code" testID="live-code" value={code} onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" placeholderTextColor="#9AA39C" keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" autoFocus style={[s.input, s.codeInput]} />
      <Button title={mode === 'create' ? 'Open account' : 'Log in'} loading={busy} disabled={code.length !== 6} onPress={() => { void verify(); }} style={[s.primary, { marginTop: 16 }]} textColor="#FFFFFF" />
      <Pressable accessibilityRole="button" onPress={() => { setStep('phone'); setError(''); }} style={s.inlineLink}><Text style={s.link}>Use a different number</Text></Pressable>
    </View>}

    {liveAvailable && step === 'phone' ? <View style={s.switchRow}>
      <Text style={s.muted}>{mode === 'create' ? 'Already have an account?' : 'New to Nest?'} </Text>
      <Pressable accessibilityRole="button" onPress={() => { setMode(mode === 'create' ? 'login' : 'create'); setError(''); }}><Text style={s.link}>{mode === 'create' ? 'Log in' : 'Open an account'}</Text></Pressable>
    </View> : null}
    <Pressable accessibilityRole="button" onPress={() => setRecovery(true)} style={s.inlineLink}><Text style={s.link}>Lost your phone?</Text></Pressable>
  </View>;

  const small = <Text style={s.small}>{liveAvailable ? 'Solana devnet · Test dollars, no real money.' : 'Demo · No real funds.'} Digital dollars. Not a bank deposit. Not FDIC insured.</Text>;

  return <View style={s.screen}>
    <StatusBar style="dark" />
    <KeyboardFrame><KeyboardScroll bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[s.split, { minHeight: height }]}>
        {wide ? <View style={s.photo}>
          <Image source={require('../../assets/nest/signin-mama.jpg')} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} accessibilityIgnoresInvertColors />
          <View style={s.photoShade} />
          <View style={s.photoCaption}><Text style={s.photoKicker}>Nest</Text><Text style={s.photoLine}>Protect what matters.</Text></View>
        </View> : null}
        <SafeAreaView edges={['top', 'bottom']} style={[s.panel, wide && s.panelWide]}>
          <View style={s.topBar}>
            <Brand small />
          </View>
          <View style={[s.center, wide && s.centerWide]}>{form}</View>
          <View style={s.footer}>{small}</View>
        </SafeAreaView>
      </View>
    </KeyboardScroll></KeyboardFrame>
    <Sheet title="Lost your phone?" visible={recovery} onClose={() => setRecovery(false)}><Text style={{ color: C.ink, fontSize: 16, lineHeight: 24, marginBottom: 20 }}>Still have your phone number? Sign in on your new phone with the same number to get back into your account. If you lost your number, contact your mobile carrier to recover it first.</Text><Button title="Back to sign in" onPress={() => setRecovery(false)} /></Sheet>
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.page },
  split: { flex: 1, flexDirection: 'row' },
  photo: { flex: 1, overflow: 'hidden', backgroundColor: '#8DA79B' },
  photoShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(16,26,19,0.18)' },
  photoCaption: { position: 'absolute', left: 48, bottom: 48, right: 48 },
  photoKicker: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', opacity: 0.85, marginBottom: 6 },
  photoLine: { color: '#FFFFFF', fontSize: 40, lineHeight: 42, fontWeight: '600', letterSpacing: -1.6 },
  panel: { flex: 1, backgroundColor: C.page, paddingHorizontal: 24 },
  panelWide: { flex: 0, width: '46%', minWidth: 480, maxWidth: 640, paddingHorizontal: 64 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, minHeight: 72 },
  center: { flex: 1, paddingTop: 40 },
  centerWide: { justifyContent: 'center', paddingTop: 0 },
  form: { width: '100%', maxWidth: 400 },
  title: { color: C.ink, fontSize: 30, lineHeight: 34, fontWeight: '600', letterSpacing: -1 },
  titleWide: { fontSize: 36, lineHeight: 40, letterSpacing: -1.3 },
  lead: { color: C.muted, fontSize: 16, lineHeight: 23, marginTop: 10, marginBottom: 28 },
  label: { color: C.ink, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.field, paddingHorizontal: 16, fontSize: 17, color: C.ink },
  codeInput: { letterSpacing: 6, fontSize: 22 },
  primary: { minHeight: 54, borderRadius: 999, backgroundColor: C.moss },
  secondary: { minHeight: 54, borderRadius: 999, backgroundColor: 'transparent', borderWidth: 1, borderColor: C.line },
  switchRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 22 },
  muted: { color: C.muted, fontSize: 15 },
  link: { color: C.moss, fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
  inlineLink: { minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start', marginTop: 6 },
  footer: { paddingVertical: 24 },
  small: { color: '#7A847D', fontSize: 12, lineHeight: 18, maxWidth: 400 },
  error: { padding: 14, borderWidth: 1, borderColor: '#E3B9A8', backgroundColor: '#FBEFEA', borderRadius: 14, marginBottom: 16 },
  errorText: { color: '#7A2E14', fontSize: 14, lineHeight: 20 },
});
