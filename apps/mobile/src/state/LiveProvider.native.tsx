import type { ReactNode } from 'react';
import { liveConfigured } from './liveConfig';

/**
 * iOS/Android: load Privy only in a development/TestFlight build that has it configured.
 * Expo Go lacks Privy's native modules, so the require below must never run there.
 */
export function LiveProvider({ children }: { children: ReactNode }) {
  if (!liveConfigured) return <>{children}</>;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose, see above
  const { PrivyLive } = require('./PrivyLive') as typeof import('./PrivyLive');
  return <PrivyLive>{children}</PrivyLive>;
}
