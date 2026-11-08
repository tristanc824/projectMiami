import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { formatPhone, normalizePhone } from '../services/dat';
import { useLive } from '../state/live';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardFrame, KeyboardScroll } from '../components/KeyboardForm';
import { Birds } from '../components/NestArtwork';
import { Brand, Button, Sheet } from '../components/ui';
import { signIn } from '../services/auth';
import { useExperience } from '../state/ExperienceProvider';
import { parsePaymentRequest } from '../domain/paymentRequest';
// The meadow welcome screen keeps the website’s moss palette in both appearances.
import { lightColors as colors } from '../theme';

export default function SignInScreen() {
  const router = useRouter();
  const { paymentRequest } = useLocalSearchParams<{ paymentRequest?: string }>();
  const { enter } = useExperience();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(false);
  const availableHeight = height - insets.top - insets.bottom;
  const live = useLive();
  // Live builds sign in by SMS with Privy; everywhere else the existing Auth0 flow is unchanged.
  const liveAvailable = live.status !== 'off';
  const [step, setStep] = useState<'start' | 'phone' | 'code'>('start');
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
  const authenticate = () => run(async () => {
    if (liveAvailable) { setStep('phone'); return; }
    await signIn(); enterApp();
  });
  const requestCode = () => run(async () => { await live.sendCode(phone); setCode(''); setStep('code'); });
  const verify = () => run(async () => { await live.verifyCode(phone, code); enterApp(); });
  const field = [s.input, { color: colors.white }];

  return <View style={s.screen}>
    <StatusBar style="light" />
    <KeyboardFrame><KeyboardScroll bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
      <View style={[s.canvas, { minHeight: height }]}>
        <View style={[s.photo, { height: Math.max(160, availableHeight * .36) }]}>
          <Image source={require('../../assets/nest/meadow.jpg')} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} />
          <View style={{ position: 'absolute', top: '24%', left: '18%' }}><Birds /></View>
          <SafeAreaView edges={['top']} style={{ padding: 24 }}><View style={s.preview}><Text style={s.previewText}>A little more peace of mind.</Text></View></SafeAreaView>
        </View>
        <View style={[s.bottom, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Brand small light />
          <Text accessibilityRole="header" style={s.title}>Protect what{'\n'}matters.</Text>
          <Text style={s.description}>Dollars. 24/7. No fees.</Text>
          {error ? <View accessibilityRole="alert" style={s.error}><Text style={s.errorText}>{error}</Text></View> : null}
          {step === 'start' ? <View style={{ gap: 10 }}>
            <Button title="Create account" loading={busy} onPress={() => { void authenticate(); }} style={s.signIn} variant="secondary" textColor="#17201A" />
            <Pressable accessibilityRole="button" accessibilityLabel="Sign in" onPress={() => { void authenticate(); }} style={s.textButton}><Text style={s.demoText}>I already have one</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Demo" onPress={enterApp} style={s.demo}><Text style={s.demoText}>Explore the demo <Text style={{ color: '#A9C4A1' }}>↗</Text></Text></Pressable>
          </View> : step === 'phone' ? <View style={{ gap: 12 }}>
            <TextInput accessibilityLabel="Phone number" testID="live-phone" value={phone} onChangeText={setPhone} placeholder="Your phone number" placeholderTextColor="#B8C9B2" keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" autoFocus style={field} />
            <Button title="Text me a code" loading={busy} disabled={phone.replace(/\D/g, '').length < 10} onPress={() => { void requestCode(); }} style={s.signIn} variant="secondary" textColor="#17201A" />
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => { setStep('start'); setError(''); }} style={s.textButton}><Text style={s.demoText}>Back</Text></Pressable>
          </View> : <View style={{ gap: 12 }}>
            <Text style={s.hint}>Enter the code we texted to {formatPhone(normalizePhone(phone) ?? phone)}.</Text>
            <TextInput accessibilityLabel="Verification code" testID="live-code" value={code} onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" placeholderTextColor="#B8C9B2" keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" autoFocus style={field} />
            <Button title="Sign in" loading={busy} disabled={code.length !== 6} onPress={() => { void verify(); }} style={s.signIn} variant="secondary" textColor="#17201A" />
            <Pressable accessibilityRole="button" accessibilityLabel="Change number" onPress={() => { setStep('phone'); setError(''); }} style={s.textButton}><Text style={s.demoText}>Change number</Text></Pressable>
          </View>}
          <Pressable accessibilityRole="button" onPress={() => setRecovery(true)} style={s.textButton}><Text style={s.hint}>Lost your phone? <Text style={{ textDecorationLine: 'underline', color: '#D7E3D2' }}>Get back in</Text></Text></Pressable>
          <Text style={s.disclosure}>{liveAvailable ? 'Solana devnet · Test dollars, no real money' : 'Demo · No real funds'}{'\n'}Digital dollars. Not a bank deposit. Not FDIC insured.</Text>
        </View>
      </View>
    </KeyboardScroll></KeyboardFrame>
    <Sheet title="Get back in" visible={recovery} onClose={() => setRecovery(false)}><Text style={{ color: colors.ink, fontSize: 16, lineHeight: 24, marginBottom: 20 }}>Still have access to your phone number? Sign in on your new phone to recover your connected account. If you lost your number, contact your account provider. Demo balances stay on the device where you created them.</Text><Button title="Back to sign in" onPress={() => { setRecovery(false); void authenticate(); }} /></Sheet>
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#16301D' },
  scroll: { flexGrow: 1, alignItems: 'center' },
  canvas: { width: '100%', maxWidth: 600, flexGrow: 1 },
  photo: { width: '100%', overflow: 'hidden', backgroundColor: '#8DA79B' },
  preview: { alignSelf: 'flex-start', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F3F0EAE6' },
  previewText: { fontSize: 13, color: '#16301D' },
  bottom: { paddingHorizontal: 26, paddingTop: 26, marginTop: -30, backgroundColor: '#16301D', borderTopLeftRadius: 32, borderTopRightRadius: 32, flex: 1 },
  title: { color: '#FFFFFF', fontSize: 44, lineHeight: 46, fontWeight: '600', letterSpacing: -2, marginTop: 16 },
  description: { color: '#C1D1BB', fontSize: 17, lineHeight: 23, marginTop: 14, marginBottom: 20 },
  signIn: { minHeight: 56, backgroundColor: '#FFFFFF' },
  textButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  demo: { minHeight: 50, borderRadius: 28, borderWidth: 1, borderColor: '#6F886D', alignItems: 'center', justifyContent: 'center' },
  demoText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  disclosure: { color: '#B8C9B2', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 2 },
  input: { minHeight: 56, borderRadius: 28, borderWidth: 1, borderColor: '#6F886D', paddingHorizontal: 22, fontSize: 18 },
  hint: { color: '#B8C9B2', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  error: { padding: 14, borderWidth: 1, borderColor: '#6F886D', borderRadius: 18, marginBottom: 14 },
  errorText: { color: '#FFFFFF', fontSize: 13, lineHeight: 19 },
});
