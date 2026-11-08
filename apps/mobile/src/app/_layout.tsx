import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { ActivityIndicator, Platform, View } from 'react-native';
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

// In a browser, pages switch in place: no slide or modal transitions. A transition caught mid-way
// (a slow payment confirming while the tab is in the background) can leave a page offset or cut off.
const web = Platform.OS === 'web';
const sheet = web ? {} : { presentation: 'modal' as const };

function ThemedStack() {
  const { colors, scheme } = useColors();
  return <><StatusBar style={scheme === 'dark' ? 'light' : 'dark'} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: web ? 'none' : 'slide_from_right' }}>
    <Stack.Screen name="(tabs)" /><Stack.Screen name="sign-in" options={{ animation: web ? 'none' : 'fade' }} /><Stack.Screen name="send" /><Stack.Screen name="money" options={sheet} /><Stack.Screen name="receipt" /><Stack.Screen name="request" options={sheet} /><Stack.Screen name="pay" /><Stack.Screen name="activity" /><Stack.Screen name="family" /><Stack.Screen name="goal" /><Stack.Screen name="contacts" /><Stack.Screen name="contact" /><Stack.Screen name="text-payments" />
  </Stack></>;
}
