// Resolver tweaks from Privy's Expo setup guide (docs.privy.io/basics/react-native/installation).
// Without them Metro picks jose's Node build, which imports `zlib`, and the iOS bundle fails.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const isPackage = (name, pkg) => name === pkg || name.startsWith(`${pkg}/`);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (isPackage(moduleName, 'isows') || isPackage(moduleName, 'zustand')) {
    return context.resolveRequest({ ...context, unstable_enablePackageExports: false }, moduleName, platform);
  }
  if (isPackage(moduleName, 'jose')) {
    return context.resolveRequest({ ...context, unstable_conditionNames: ['browser'] }, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
