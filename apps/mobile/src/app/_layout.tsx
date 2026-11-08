import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LiveProvider } from '../state/LiveProvider';
import { ContactsProvider } from '../state/ContactsProvider';
import { WalletProvider } from '../state/WalletProvider';
import { ExperienceProvider } from '../state/ExperienceProvider';
import { ThemeProvider } from '../state/ThemeProvider';
import { useColors } from '../theme';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Figtree: require('../../assets/fonts/Figtree-Regular.ttf'),
    'Figtree-Medium': require('../../assets/fonts/Figtree-Medium.ttf'),
    'Figtree-Semibold': require('../../assets/fonts/Figtree-Semibold.ttf'),
  });
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: '#F3F0EA', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#2F5D3A" /></View>;
  return <ThemeProvider><SafeAreaProvider><LiveProvider><WalletProvider><ExperienceProvider><ContactsProvider><ThemedStack /></ContactsProvider></ExperienceProvider></WalletProvider></LiveProvider></SafeAreaProvider></ThemeProvider>;
}

function ThemedStack() {
  const { colors, scheme } = useColors();
  return <><StatusBar style={scheme === 'dark' ? 'light' : 'dark'} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' }}>
    <Stack.Screen name="(tabs)" /><Stack.Screen name="sign-in" options={{ animation: 'fade' }} /><Stack.Screen name="send" /><Stack.Screen name="money" options={{ presentation: 'modal' }} /><Stack.Screen name="receipt" /><Stack.Screen name="request" options={{ presentation: 'modal' }} /><Stack.Screen name="pay" /><Stack.Screen name="activity" /><Stack.Screen name="family" /><Stack.Screen name="goal" /><Stack.Screen name="contacts" /><Stack.Screen name="contact" />
  </Stack></>;
}
