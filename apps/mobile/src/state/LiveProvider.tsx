import type { ReactNode } from 'react';

/** Web build: Privy's Expo SDK doesn't support the web, so Guard stays in demo mode (LiveContext default is 'off'). */
export function LiveProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
