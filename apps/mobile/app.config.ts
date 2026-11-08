import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN?.trim();
  // Keep the existing signing identity and callback scheme across the display-name change.
  const bundleIdentifier = process.env.EXPO_PUBLIC_BUNDLE_IDENTIFIER || 'com.projectmiami.lazo';
  const projectId = process.env.EAS_PROJECT_ID;
  return {
    ...config,
    name: 'Nest',
    slug: 'nest-sharkbyte',
    version: '0.1.0',
    scheme: 'lazo',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: './assets/icon.png',
    ios: { supportsTablet: true, bundleIdentifier, infoPlist: { NSFaceIDUsageDescription: 'Nest uses Face ID to unlock your account and approve payments.' } },
    android: { blockedPermissions: ['android.permission.WRITE_CONTACTS'], package: bundleIdentifier, adaptiveIcon: { foregroundImage: './assets/android-icon-foreground.png', monochromeImage: './assets/android-icon-monochrome.png', backgroundColor: '#2F5D3A' } },
    web: { bundler: 'metro', output: 'single', favicon: './assets/favicon.png', name: 'Nest — Protect what matters.' },
    // expo-secure-store, expo-web-browser and react-native-quick-crypto back Privy's live wallet in dev/TestFlight builds.
    plugins: [['expo-speech-recognition', { microphonePermission: 'Nest uses the microphone when you choose to speak a payment request.', speechRecognitionPermission: 'Nest transcribes your spoken payment request so you can review it before sending.' }], './plugins/withHermesDebugCompatibility', ['expo-build-properties', { ios: { buildReactNativeFromSource: true, usePrecompiledModules: false } }], ['expo-contacts', { contactsPermission: 'Nest uses contacts to help you choose who to pay. Your contact list stays on this device.' }], 'expo-router', 'expo-font', ['expo-local-authentication', { faceIDPermission: 'Nest uses Face ID to unlock your account and approve payments.' }], ['expo-secure-store', { faceIDPermission: 'Nest uses Face ID to unlock your account and approve payments.' }], 'expo-web-browser', 'react-native-quick-crypto', ...(domain ? [['react-native-auth0', { domain, customScheme: 'lazo' }] as [string, Record<string, string>]] : [])],
    experiments: { typedRoutes: true, ...(process.env.NEST_WEB_BASE_PATH ? { baseUrl: process.env.NEST_WEB_BASE_PATH } : {}) },
    extra: { ...(projectId ? { eas: { projectId } } : {}), demoMode: true },
  };
};
