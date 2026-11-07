import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LiveProvider } from '../state/LiveProvider';
import { WalletProvider } from '../state/WalletProvider';
import { ExperienceProvider } from '../state/ExperienceProvider';
import { ThemeProvider } from '../state/ThemeProvider';
import { useColors } from '../theme';

export default function RootLayout() {
  return <ThemeProvider><SafeAreaProvider><LiveProvider><WalletProvider><ExperienceProvider><ThemedStack /></ExperienceProvider></WalletProvider></LiveProvider></SafeAreaProvider></ThemeProvider>;
}

function ThemedStack() {
  const { colors, scheme } = useColors();
  return <><StatusBar style={scheme === 'dark' ? 'light' : 'dark'} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' }}>
    <Stack.Screen name="(tabs)" /><Stack.Screen name="sign-in" options={{ animation: 'fade' }} /><Stack.Screen name="send" /><Stack.Screen name="money" options={{ presentation: 'modal' }} /><Stack.Screen name="receipt" /><Stack.Screen name="request" options={{ presentation: 'modal' }} />
  </Stack></>;
}
