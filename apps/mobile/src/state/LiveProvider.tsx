import { ActivityIndicator, Text, View } from 'react-native';
import { lazy, Suspense, type ReactNode } from 'react';
import { LiveContext, liveOff } from './live';

const PrivyWeb = lazy(() => import('./PrivyWeb'));
const webWalletEnabled = process.env.EXPO_PUBLIC_NEST_WEB_WALLET === 'true';

/** The website build connects Privy's browser wallet; standalone Expo web previews retain demo mode. */
export function LiveProvider({ children }: { children: ReactNode }) {
  if (!webWalletEnabled) return <>{children}</>;
  const problem = !process.env.EXPO_PUBLIC_PRIVY_APP_ID ? 'Web sign-in is not configured.' : !window.isSecureContext ? 'Browser sign-in needs a secure connection. Open this website on localhost on your computer, or use HTTPS.' : '';
  if (problem) {
    const unavailable = async () => { throw new Error(problem); };
    return <LiveContext.Provider value={{ ...liveOff, status: 'signed-out', problem, sendCode: unavailable, verifyCode: unavailable }}>{children}</LiveContext.Provider>;
  }
  return <Suspense fallback={<View style={{ flex: 1, backgroundColor: '#F3F0EA', alignItems: 'center', justifyContent: 'center', gap: 14 }}><ActivityIndicator color="#2F5D3A" /><Text>Opening Nest…</Text></View>}><PrivyWeb>{children}</PrivyWeb></Suspense>;
}
