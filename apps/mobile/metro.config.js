// Resolver tweaks from Privy's Expo setup guide (docs.privy.io/basics/react-native/installation).
// Without them Metro picks jose's Node build, which imports `zlib`, and the iOS bundle fails.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.cacheVersion = `nest-browser-${process.env.NEST_TEST_WEB_AUTH === 'true' ? 'test' : 'real'}`;

const isPackage = (name, pkg) => name === pkg || name.startsWith(`${pkg}/`);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Build-time substitution for isolated browser tests only; the normal website never enables it.
  if (platform === 'web' && process.env.NEST_TEST_WEB_AUTH === 'true' && isPackage(moduleName, '@privy-io/react-auth')) {
    return context.resolveRequest(context, require('node:path').resolve(__dirname, 'tests/fixtures/privy-browser.tsx'), platform);
  }
  if (isPackage(moduleName, 'isows') || isPackage(moduleName, 'zustand')) {
    return context.resolveRequest({ ...context, unstable_enablePackageExports: false }, moduleName, platform);
  }
  if (isPackage(moduleName, 'jose')) {
    return context.resolveRequest({ ...context, unstable_conditionNames: ['browser'] }, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
