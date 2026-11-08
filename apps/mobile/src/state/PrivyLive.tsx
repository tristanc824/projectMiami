import { PrivyProvider, useEmbeddedSolanaWallet, useLoginWithSMS, usePrivy, useSigners } from '@privy-io/expo';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import * as dat from '../services/dat';
import { ConnectedWallet } from './ConnectedWallet';
import { privyAppId, privyClientId } from './liveConfig';

/** Only loaded by LiveProvider.native in a configured development/TestFlight build. */
export function PrivyLive({ children }: { children: ReactNode }) {
  return <PrivyProvider appId={privyAppId} clientId={privyClientId}><Session>{children}</Session></PrivyProvider>;
}

function Session({ children }: { children: ReactNode }) {
  const { isReady, user, getAccessToken, logout: privyLogout } = usePrivy();
  const solana = useEmbeddedSolanaWallet();
  const { sendCode: privySendCode, loginWithCode } = useLoginWithSMS();
  const [walletProblem, setWalletProblem] = useState('');
  const creating = useRef(false);

  const wallet = solana.status === 'connected' ? solana.wallets[0] : undefined;
  const address = wallet?.address ?? '';
  const phoneAccount = user?.linked_accounts.find(account => account.type === 'phone') as { phoneNumber?: string; number?: string } | undefined;
  const phone = phoneAccount?.phoneNumber || phoneAccount?.number || '';

  // loginWithCode doesn't auto-create wallets, so make one for new users. Numbers someone already
  // sent money to have a wallet created by the server, and must not get a second one.
  useEffect(() => {
    if (!user || solana.status !== 'not-created' || creating.current) return;
    creating.current = true;
    solana.create().catch(failure => {
      creating.current = false;
      setWalletProblem(failure instanceof Error ? failure.message : 'Your wallet could not be set up.');
    });
  }, [user, solana]);

  const problem = !user ? '' : solana.status === 'needs-recovery' ? 'This wallet needs to be recovered before it can be used on this device.'
    : solana.status === 'error' ? solana.error || 'Your wallet could not be loaded.' : walletProblem;

  const sign = useCallback<dat.Signer>(async message => {
    if (!wallet) throw new Error('Your wallet is still being set up.');
    const provider = await wallet.getProvider();
    // The prepared message is already base64, which is how Privy expects raw bytes.
    const { signature } = await provider.request({ method: 'signMessage', params: { message } });
    return signature;
  }, [wallet]);

  const { addSigners, removeSigners } = useSigners();
  const addSigner = useCallback(async (settings: dat.TextPayments) => {
    if (!address) throw new Error('Your wallet is still being set up.');
    await addSigners({ address, signers: [{ signerId: settings.signerId, policyIds: [settings.policyId] }] });
  }, [address, addSigners]);
  const removeSigner = useCallback(async () => { if (address) await removeSigners({ address }); }, [address, removeSigners]);

  return <ConnectedWallet addSigner={addSigner} removeSigner={removeSigner} status={!isReady ? 'loading' : !user ? 'signed-out' : !address ? 'setting-up' : 'ready'} problem={problem} phone={phone} address={address} sign={sign} getAccessToken={getAccessToken}
    sendCode={async input => { await privySendCode({ phone: input }); }}
    verifyCode={async (input, code) => { await loginWithCode({ phone: input, code }); }}
    logout={async () => { await privyLogout(); creating.current = false; setWalletProblem(''); }}>{children}</ConnectedWallet>;
}
