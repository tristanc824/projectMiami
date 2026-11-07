// Privy needs WebCrypto polyfills loaded before anything else (docs.privy.io/basics/react-native/installation).
// They come from native modules that Expo Go and the web don't have, so load them only in native dev/TestFlight builds.
const { Platform } = require('react-native');
const Constants = require('expo-constants').default;

if (Platform.OS !== 'web' && Constants.executionEnvironment !== 'storeClient') {
  require('@privy-io/expo/polyfills');
}

require('expo-router/entry');
