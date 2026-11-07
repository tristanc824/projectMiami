import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../components/Text';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SpinningGlobe } from '../components/SpinningGlobe';
import { Brand, Button } from '../components/ui';
import { signIn } from '../services/auth';
import { useExperience } from '../state/ExperienceProvider';
// The welcome screen is intentionally dark in both appearances.
import { lightColors as colors } from '../theme';

export default function SignInScreen() {
  const router = useRouter();
  const { enter } = useExperience();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const availableHeight = height - insets.top - insets.bottom;
  // Reserve room for the header and bottom controls, keeping the entire sphere visible.
  const globeSize = Math.max(160, Math.min(width - 36, 480, availableHeight - 320));
  const enterApp = () => { enter(); router.dismissTo('/'); };
  const authenticate = async () => {
    setBusy(true); setError('');
    try { await signIn(); enterApp(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Sign-in could not be completed.'); }
    finally { setBusy(false); }
  };

  return <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={s.screen}>
    <StatusBar style="light" />
    <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
      <View style={[s.canvas, { minHeight: availableHeight }]}>
        <View style={s.header}><Brand light /><View style={s.network}><View style={s.dot} /><Text style={s.networkLabel}>BUILT ON SOLANA</Text></View></View>
        <Text accessibilityRole="header" style={s.title}>Protect what matters.</Text>
        <View style={s.stage}><SpinningGlobe size={globeSize} /></View>
        <View style={s.bottom}>
          {error ? <View accessibilityRole="alert" style={s.error}><Text style={s.errorText}>{error}</Text></View> : null}
          <View style={s.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Demo" onPress={enterApp} style={({ pressed }) => [s.demo, { opacity: pressed ? .65 : 1 }]}><Text style={s.demoText}>Demo</Text></Pressable>
            <Button title="Sign in" loading={busy} onPress={() => { void authenticate(); }} style={s.signIn} />
          </View>
          <Text style={s.disclosure}>Hackathon preview · No real funds</Text>
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  scroll: { flexGrow: 1, alignItems: 'center' },
  canvas: { width: '100%', maxWidth: 600, flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  network: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 4, width: 4, borderRadius: 2, backgroundColor: colors.accent },
  networkLabel: { fontSize: 8, fontWeight: '600', letterSpacing: 1.4, color: '#A1A5AE' },
  title: { color: colors.white, fontSize: 38, lineHeight: 42, fontWeight: '800', letterSpacing: -1.5, textAlign: 'center', marginTop: 26 },
  stage: { flex: 1, minHeight: 0, justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
  bottom: { width: '100%' },
  actions: { flexDirection: 'row', gap: 12 },
  signIn: { flex: 1, minHeight: 58, borderRadius: 32 },
  demo: { flex: 1, minHeight: 58, borderRadius: 32, borderWidth: 1, borderColor: '#FFFFFF30', backgroundColor: '#FFFFFF0D', alignItems: 'center', justifyContent: 'center' },
  demoText: { color: colors.white, fontSize: 17, fontWeight: '700', letterSpacing: -.35 },
  disclosure: { color: '#868A94', fontSize: 10, lineHeight: 14, textAlign: 'center', marginTop: 16 },
  error: { padding: 14, borderWidth: 1, borderColor: '#FFFFFF26', borderRadius: 18, marginBottom: 14 },
  errorText: { color: colors.white, fontSize: 13, lineHeight: 19 },
});
