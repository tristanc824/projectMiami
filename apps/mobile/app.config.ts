import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN?.trim();
  // Keep the existing signing identity and callback scheme across the display-name change.
  const bundleIdentifier = process.env.EXPO_PUBLIC_BUNDLE_IDENTIFIER || 'com.projectmiami.lazo';
  const projectId = process.env.EAS_PROJECT_ID;
  return {
    ...config,
    name: 'Guard',
    slug: 'guard-sharkbyte',
    version: '0.1.0',
    scheme: 'lazo',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: './assets/icon.png',
    ios: { supportsTablet: true, bundleIdentifier },
    android: { package: bundleIdentifier, adaptiveIcon: { foregroundImage: './assets/icon.png', backgroundColor: '#FFFFFF' } },
    web: { bundler: 'metro', output: 'single', favicon: './assets/favicon.png', name: 'Guard — Protect what matters.' },
    plugins: ['expo-router', 'expo-font', ...(domain ? [['react-native-auth0', { domain, customScheme: 'lazo' }] as [string, Record<string, string>]] : [])],
    experiments: { typedRoutes: true },
    extra: { ...(projectId ? { eas: { projectId } } : {}), demoMode: true },
  };
};
