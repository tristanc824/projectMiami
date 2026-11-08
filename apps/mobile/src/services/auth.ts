import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import type Auth0 from 'react-native-auth0';
import type { Auth0Client } from '@auth0/auth0-spa-js';

export type SessionProfile = { name: string; email?: string; picture?: string };
const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN?.trim() || '';
const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID?.trim() || '';
export const authConfigured = /^[a-zA-Z0-9.-]+$/.test(domain) && domain.includes('.') && clientId.length > 0;
const isExpoGo = () => Platform.OS !== 'web' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let nativeClient: Auth0 | undefined;
let browserClient: Auth0Client | undefined;

function checkConfiguration() {
  if (!authConfigured) throw new Error('Sign-in is not connected in this preview. You can continue exploring the demo.');
  if (isExpoGo()) throw new Error('Auth0 sign-in needs the Nest development or TestFlight build. The demo works in Expo Go.');
}

async function nativeAuth() {
  if (!nativeClient) {
    const { default: Client } = await import('react-native-auth0');
    nativeClient = new Client({ domain, clientId });
  }
  return nativeClient;
}
async function webAuth() {
  if (!browserClient) {
    const { createAuth0Client } = await import('@auth0/auth0-spa-js');
    browserClient = await createAuth0Client({ domain, clientId, authorizationParams: { redirect_uri: window.location.origin, scope: 'openid profile email' }, cacheLocation: 'memory' });
  }
  return browserClient;
}
function profile(value: { name?: string; nickname?: string; email?: string; picture?: string }): SessionProfile {
  return { name: value.name || value.nickname || 'Nest member', email: value.email, picture: value.picture };
}

export async function signIn(): Promise<SessionProfile> {
  checkConfiguration();
  if (Platform.OS === 'web') {
    const client = await webAuth();
    await client.loginWithPopup();
    return profile((await client.getUser()) || {});
  }
  const client = await nativeAuth();
  const credentials = await client.webAuth.authorize({ scope: 'openid profile email' }, { customScheme: 'lazo' });
  await client.credentialsManager.saveCredentials(credentials);
  return profile(await client.auth.userInfo({ token: credentials.accessToken }));
}

export async function restoreSession(): Promise<SessionProfile | null> {
  if (!authConfigured || isExpoGo()) return null;
  if (Platform.OS === 'web') {
    const client = await webAuth();
    return await client.isAuthenticated() ? profile((await client.getUser()) || {}) : null;
  }
  const client = await nativeAuth();
  if (!await client.credentialsManager.hasValidCredentials()) return null;
  const credentials = await client.credentialsManager.getCredentials();
  return profile(await client.auth.userInfo({ token: credentials.accessToken }));
}

export async function signOut() {
  checkConfiguration();
  if (Platform.OS === 'web') {
    const client = await webAuth();
    await client.logout({ logoutParams: { returnTo: window.location.origin } });
  } else {
    const client = await nativeAuth();
    await client.webAuth.clearSession({}, { customScheme: 'lazo' });
    await client.credentialsManager.clearCredentials();
  }
}
