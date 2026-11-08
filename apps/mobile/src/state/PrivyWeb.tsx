import { PrivyProvider, useLoginWithSms, usePrivy } from '@privy-io/react-auth';
import { useCreateWallet, useSignMessage, useWallets } from '@privy-io/react-auth/solana';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { bytesToBase64, type Signer } from '../services/dat';
import { ConnectedWallet } from './ConnectedWallet';

const appId = process.env.EXPO_PUBLIC_PRIVY_APP_ID?.trim() || '';
const rpcs = {
  'solana:devnet': {
    rpc: createSolanaRpc('https://api.devnet.solana.com'),
    rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.devnet.solana.com'),
  },
};
export default function PrivyWeb({ children }: { children: ReactNode }) {
  return <PrivyProvider appId={appId} config={{ loginMethods: ['sms'], intl: { defaultCountry: 'US' }, appearance: { walletChainType: 'solana-only', theme: 'light', accentColor: '#2F5D3A' }, embeddedWallets: { showWalletUIs: true, solana: { createOnLogin: 'users-without-wallets' } }, solana: { rpcs } }}><Session>{children}</Session></PrivyProvider>;
}
function Session({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, getAccessToken, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();
  const { signMessage } = useSignMessage();
  const { sendCode, loginWithCode } = useLoginWithSms();
  const [problem, setProblem] = useState('');
  const creating = useRef(false);
  const wallet = wallets.find(candidate => candidate.standardWallet.name === 'Privy');
  const address = authenticated ? wallet?.address ?? '' : '';
  const hasEmbeddedWallet = user?.linkedAccounts.some(account => account.type === 'wallet' && account.chainType === 'solana' && account.connectorType === 'embedded');
  useEffect(() => {
    if (!authenticated || !walletsReady || wallet || creating.current || hasEmbeddedWallet) return;
    creating.current = true;
    void createWallet().catch(() => { setProblem('Your wallet could not be created. Sign out and try again.'); });
  }, [authenticated, walletsReady, wallet, hasEmbeddedWallet, createWallet]);
  const sign = useCallback<Signer>(async encoded => {
    if (!authenticated || !wallet) throw new Error('Sign in to your wallet before sending.');
    const message = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const { signature } = await signMessage({ wallet, message });
    return bytesToBase64(signature);
  }, [authenticated, wallet, signMessage]);
  return <ConnectedWallet status={!ready ? 'loading' : !authenticated ? 'signed-out' : !address ? 'setting-up' : 'ready'} problem={authenticated ? problem : ''} phone={authenticated ? user?.phone?.number ?? '' : ''} address={address} sign={sign} getAccessToken={getAccessToken}
    sendCode={phoneNumber => sendCode({ phoneNumber })}
    verifyCode={(_phone, code) => loginWithCode({ code })}
    logout={async () => { await logout(); creating.current = false; setProblem(''); }}>{children}</ConnectedWallet>;
}
