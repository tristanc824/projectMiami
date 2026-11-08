// Isolated build-time test double. No real SMS, wallet keys, or valid access token.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
const wallet = { address: '11111111111111111111111111111111', standardWallet: { name: 'Privy' } };
const Context = createContext({ authenticated: false, phone: '', setAuthenticated: (_value: boolean) => {}, setPhone: (_phone: string) => {} });
export function PrivyProvider({ children }: { children: ReactNode; appId: string; config: unknown }) {
  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem('nest.test.auth') === 'yes');
  const [phone, setPhone] = useState('+13055550123');
  return <Context.Provider value={{ authenticated, phone, setAuthenticated, setPhone }}>{children}</Context.Provider>;
}
export function usePrivy() {
  const { authenticated, phone, setAuthenticated } = useContext(Context);
  const getAccessToken = useCallback(async () => authenticated ? 'test-session-token' : null, [authenticated]);
  const logout = useCallback(async () => { localStorage.removeItem('nest.test.auth'); setAuthenticated(false); }, [setAuthenticated]);
  const user = useMemo(() => authenticated ? { phone: { number: phone }, linkedAccounts: [{ type: 'wallet', chainType: 'solana', connectorType: 'embedded' }] } : null, [authenticated, phone]);
  return { ready: true, authenticated, user, getAccessToken, logout };
}
export function useLoginWithSms() {
  const { setPhone, setAuthenticated } = useContext(Context);
  return {
    sendCode: async ({ phoneNumber }: { phoneNumber: string }) => { setPhone(phoneNumber); },
    loginWithCode: async ({ code }: { code: string }) => {
      if (code !== '123456') throw new Error('That verification code is incorrect.');
      localStorage.setItem('nest.test.auth', 'yes'); setAuthenticated(true);
    },
  };
}
export function useWallets() { const { authenticated } = useContext(Context); return { ready: true, wallets: authenticated ? [wallet] : [] }; }
export function useCreateWallet() { return { createWallet: async () => ({ wallet }) }; }
export function useSignMessage() {
  const { authenticated } = useContext(Context);
  return { signMessage: async ({ message }: { message: Uint8Array; wallet: unknown }) => {
    if (!authenticated || message.length !== 4 || message[0] !== 1) throw new Error('Unexpected test signing request.');
    return { signature: new Uint8Array(64).fill(7) };
  } };
}
