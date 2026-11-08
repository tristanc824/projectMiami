import { Platform } from 'react-native';

export type PinGrant = { ticket: string; expiresAt: number; unlockToken?: string };
const key = (owner: string) => `nest.biometric-grant.${owner}`;
const preference = (owner: string) => `nest.biometric-enabled.${owner}`;
export async function biometricStatus(owner: string) {
  if (Platform.OS === 'web') return { available: false, enabled: false, label: 'Biometrics' };
  try {
    const auth = await import('expo-local-authentication');
    const secure = await import('expo-secure-store');
    const available = await auth.hasHardwareAsync() && await auth.isEnrolledAsync() && secure.canUseBiometricAuthentication();
    const types = await auth.supportedAuthenticationTypesAsync();
    return { available, enabled: await secure.getItemAsync(preference(owner)) === 'on', label: types.includes(auth.AuthenticationType.FACIAL_RECOGNITION) && Platform.OS === 'ios' ? 'Face ID' : 'Biometrics' };
  } catch { return { available: false, enabled: false, label: 'Biometrics' }; }
}
export async function saveBiometricGrant(owner: string, grant: PinGrant) {
  const secure = await import('expo-secure-store');
  await secure.setItemAsync(key(owner), JSON.stringify(grant), { requireAuthentication: true, authenticationPrompt: 'Protect your Nest unlock with biometrics' });
}
export async function enableBiometrics(owner: string, grant: PinGrant) {
  const status = await biometricStatus(owner);
  if (!status.available) throw new Error('Set up Face ID or fingerprints in your phone settings, and use the latest Nest development build.');
  const auth = await import('expo-local-authentication');
  const result = await auth.authenticateAsync({ promptMessage: 'Enable biometrics for Nest', disableDeviceFallback: true, fallbackLabel: 'Use app PIN', biometricsSecurityLevel: 'strong' });
  if (!result.success) throw new Error('Biometrics were not confirmed. Your app PIN still works.');
  await saveBiometricGrant(owner, grant);
  await (await import('expo-secure-store')).setItemAsync(preference(owner), 'on');
}
export async function readBiometricGrant(owner: string, prompt: string): Promise<PinGrant> {
  const raw = await (await import('expo-secure-store')).getItemAsync(key(owner), { requireAuthentication: true, authenticationPrompt: prompt });
  const value = raw ? JSON.parse(raw) : null;
  if (typeof value?.ticket !== 'string' || !Number.isFinite(value?.expiresAt) || value.expiresAt <= Date.now()) throw new Error('Enter your app PIN to refresh biometric access.');
  return value;
}
export async function clearBiometricGrant(owner: string, disable = false) {
  if (Platform.OS === 'web') return;
  const secure = await import('expo-secure-store');
  await secure.deleteItemAsync(key(owner));
  if (disable) await secure.deleteItemAsync(preference(owner));
}
