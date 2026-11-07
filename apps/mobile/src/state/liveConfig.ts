import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { datConfigured } from '../services/dat';

export const privyAppId = process.env.EXPO_PUBLIC_PRIVY_APP_ID?.trim() || '';
export const privyClientId = process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID?.trim() || '';

const isExpoGo = Platform.OS !== 'web' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Live mode needs a native dev/TestFlight build (not Expo Go, not web), Privy IDs, and the DAT API URL. */
export const liveConfigured = Platform.OS !== 'web' && !isExpoGo && !!privyAppId && !!privyClientId && datConfigured;
