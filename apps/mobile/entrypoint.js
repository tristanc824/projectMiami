// Privy needs WebCrypto polyfills loaded before anything else (docs.privy.io/basics/react-native/installation).
// They come from native modules that Expo Go and the web don't have, so load them only in native dev/TestFlight builds.
const { Platform, LogBox } = require('react-native');

// React Native can deliver a queued animation event after navigation removes
// its last listener. Filter this exact development-only warning; keep all other
// warnings and errors visible so real demo failures are still reported.
if (__DEV__ && Platform.OS !== 'web') {
  LogBox.ignoreLogs(['Sending `onAnimatedValueUpdate` with no listeners registered.']);
}
const Constants = require('expo-constants').default;

if (Platform.OS !== 'web' && Constants.executionEnvironment !== 'storeClient') {
  require('@privy-io/expo/polyfills');
}

require('expo-router/entry');
