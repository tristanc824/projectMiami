import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { call, post, setAppPinTicket, onPinRequired } from '../services/dat';
import { useLive } from './live';
import { registerApproval } from '../services/approval';
import { setSecurityGateVisible } from '../services/presentation';
import { biometricStatus, enableBiometrics, readBiometricGrant, saveBiometricGrant, clearBiometricGrant } from '../services/biometrics';
import { useColors } from '../theme';
import { Text, TextInput } from '../components/Text';
import { Brand, Button, Notice } from '../components/ui';
import { KeyboardFrame, KeyboardScroll } from '../components/KeyboardForm';

type Grant = { ticket: string; expiresAt: number; unlockToken?: string };
type Mode = 'loading' | 'create' | 'unlock' | 'open' | 'failed' | 'approve';
type Biometric = { available: boolean; enabled: boolean; label: string };
const Context = createContext<{ lock: () => Promise<void>; change: (pin: string, currentPin: string) => Promise<void>; biometric: Biometric; setBiometric: (enabled: boolean) => Promise<void> }>({ lock: async () => {}, change: async () => { throw new Error('Sign in first.'); }, biometric: { available: false, enabled: false, label: 'Biometrics' }, setBiometric: async () => { throw new Error('Sign in first.'); } });
const storageKey = (owner: string) => `nest.app-pin.${owner}`;
async function readGrant(owner: string): Promise<Grant | null> {
  try {
    const raw = Platform.OS === 'web' ? sessionStorage.getItem(storageKey(owner)) : await (await import('expo-secure-store')).getItemAsync(storageKey(owner));
    const value = raw ? JSON.parse(raw) : null;
    return typeof value?.ticket === 'string' && value.expiresAt > Date.now() ? value : null;
  } catch { return null; }
}
async function storeGrant(owner: string, value: Grant | null) {
  try {
    if (Platform.OS === 'web') { if (value) sessionStorage.setItem(storageKey(owner), JSON.stringify(value)); else sessionStorage.removeItem(storageKey(owner)); }
    else { const secure = await import('expo-secure-store'); if (value) await secure.setItemAsync(storageKey(owner), JSON.stringify(value)); else await secure.deleteItemAsync(storageKey(owner)); }
  } catch { /* Keep a short-lived grant in memory when session storage is unavailable. Never store the PIN. */ }
}
export function PinProvider({ children }: { children: ReactNode }) {
  const live = useLive();
  const owner = live.status === 'ready' ? live.address : '';
  const tokenSource = live.getAccessToken;
  const [state, setState] = useState<{ owner: string; mode: Mode; expiresAt?: number; error?: string }>({ owner: '', mode: 'loading' });
  const [bio, setBio] = useState<{ owner: string; value: Biometric }>({ owner: '', value: { available: false, enabled: false, label: 'Biometrics' } });
  const biometric = bio.owner === owner ? bio.value : { available: false, enabled: false, label: 'Biometrics' };
  const [approval, setApproval] = useState<{ owner: string; label: string } | null>(null);
  const pending = useRef<{ owner: string; resolve: () => void; reject: (error: Error) => void } | null>(null);
  const grantRef = useRef<{ owner: string; grant: Grant } | null>(null);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const activeOwner = useRef(owner);
  const previousOwner = useRef(owner);
  useEffect(() => {
    const previous = previousOwner.current;
    if (previous && previous !== owner) { void storeGrant(previous, null); void clearBiometricGrant(previous).catch(() => {}); }
    previousOwner.current = owner;
  }, [owner]);
  const stateRef = useRef(state);
  useLayoutEffect(() => { activeOwner.current = owner; stateRef.current = state; }, [owner, state]);
  const cancelApproval = (message = 'Payment approval cancelled. Nothing new was sent.') => {
    pending.current?.reject(new Error(message)); pending.current = null; setApproval(null);
  };
  useEffect(() => {
    return registerApproval(label => new Promise<void>((resolve, reject) => {
      if (!owner || activeOwner.current !== owner || stateRef.current.owner !== owner || stateRef.current.mode !== 'open') { reject(new Error('Unlock Nest before approving a payment.')); return; }
      if (pending.current) { reject(new Error('Another approval is already open.')); return; }
      pending.current = { owner, resolve, reject }; setApproval({ owner, label });
    }));
  }, [owner]);
  useEffect(() => {
    let active = true;
    setAppPinTicket(''); grantRef.current = null;
    if (!owner) return;
    void (async () => {
      const biometric = await biometricStatus(owner);
      if (!active) return;
      setBio({ owner, value: biometric });
      // A biometric-protected grant is read only after the person taps the biometric button.
      const grant = biometric.enabled ? null : await readGrant(owner);
      const token = await tokenSource();
      if (!token) throw new Error('Sign in again to set up your PIN.');
      const status = await call<{ configured: boolean; sessionValid: boolean; frozen?: boolean }>('/api/account/pin', { method: 'GET', headers: { authorization: `Bearer ${token}`, ...(grant ? { 'x-nest-pin': grant.ticket } : {}) } });
      if (!active) return;
      if (grant && status.sessionValid && !status.frozen) { grantRef.current = { owner, grant }; setAppPinTicket(grant.ticket); setState({ owner, mode: 'open', expiresAt: grant.expiresAt }); }
      else setState({ owner, mode: !status.configured ? 'create' : status.frozen ? 'unlock' : 'open' });
    })().catch(failure => { if (active) setState({ owner, mode: 'failed', error: failure instanceof Error ? failure.message : 'Could not load PIN settings.' }); });
    return () => {
      active = false; setAppPinTicket('');
      if (pending.current?.owner === owner) { pending.current.reject(new Error('Your account changed. Please try again.')); pending.current = null; }
      // Owner-scoped grants are cleared when accounts change.
    };
  }, [owner, tokenSource, retry]);
  const closeGate = () => { setAppPinTicket(''); void storeGrant(owner, null); cancelApproval('Nest was locked. Unlock before sending money.'); setState({ owner, mode: 'unlock' }); };
  const lock = async () => {
    if (!owner || busyRef.current) throw new Error('Wait for the current security action to finish.');
    const { approvePayment } = await import('../services/approval');
    await approvePayment('Freeze Nest payments');
    const frozen = await post<{ unlockToken?: string }>(tokenSource, '/api/account/security', { action: 'freeze' });
    if (biometric.enabled && frozen.unlockToken && grantRef.current?.owner === owner) {
      try { await saveBiometricGrant(owner, { ...grantRef.current.grant, unlockToken: frozen.unlockToken }); } catch { /* A fresh app PIN can always unfreeze if protected storage is unavailable. */ }
    }
    if (activeOwner.current === owner) closeGate();
  };
  useEffect(() => onPinRequired(() => {
    if (!owner) return;
    setAppPinTicket(''); void storeGrant(owner, null);
    pending.current?.reject(new Error('Unlock Nest before sending money.')); pending.current = null; setApproval(null);
    setState({ owner, mode: 'unlock' });
  }), [owner]);
  // Returning to an authenticated session does not lock browsing. Approval is
  // requested for each outgoing payment or security change instead.
  useEffect(() => {
    if (!owner || Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', next => {
      if (next !== 'background' || busyRef.current || activeOwner.current !== owner || !pending.current) return;
      pending.current.reject(new Error('Approval cancelled while Nest was in the background. Please try again.'));
      pending.current = null; setApproval(null);
    });
    return () => subscription.remove();
  }, [owner]);
  useEffect(() => {
    if (!owner || state.owner !== owner || state.mode !== 'open' || !state.expiresAt) return;
    const timer = setTimeout(() => {
      if (activeOwner.current !== owner) return;
      setAppPinTicket(''); grantRef.current = null; void storeGrant(owner, null);
      setState({ owner, mode: 'open' });
      pending.current?.reject(new Error('Your approval expired. Please try again.')); pending.current = null; setApproval(null);
    }, Math.max(0, state.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [owner, state]);
  const accept = async (grant: Grant) => {
    if (typeof grant.ticket !== 'string' || !Number.isFinite(grant.expiresAt) || grant.expiresAt <= Date.now()) throw new Error('PIN verification did not complete. Please try again.');
    if (activeOwner.current !== owner) throw new Error('Your account changed. Please sign in again.');
    grantRef.current = { owner, grant };
    if (biometric.enabled) {
      await storeGrant(owner, null);
      try { await saveBiometricGrant(owner, grant); } catch { /* PIN remains available when the device cannot update its protected grant. */ }
    } else await storeGrant(owner, grant);
    if (activeOwner.current !== owner) throw new Error('Your account changed. Please sign in again.');
    setAppPinTicket(grant.ticket); setState({ owner, mode: 'open', expiresAt: grant.expiresAt });
  };
  const finishApproval = () => {
    const request = pending.current; pending.current = null; setApproval(null);
    if (request?.owner === owner && activeOwner.current === owner) request.resolve();
    else request?.reject(new Error('Your account changed. Please try again.'));
  };
  const complete = async (action: 'create' | 'verify' | 'change', pin: string, currentPin?: string) => {
    if (!owner || busyRef.current) throw new Error('Wait for the current security action to finish.');
    busyRef.current = true; setBusy(true);
    try {
      const grant = await post<Grant>(tokenSource, '/api/account/pin', { action, pin, ...(currentPin ? { currentPin } : {}), ...(stateRef.current.mode === 'unlock' ? { unlock: true } : {}) });
      await accept(grant);
      if (pending.current) finishApproval();
    } finally { busyRef.current = false; setBusy(false); }
  };
  const useBiometric = async () => {
    if (!owner || busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      const grant = await readBiometricGrant(owner, approval?.label || 'Unlock Nest');
      if (activeOwner.current !== owner) throw new Error('Your account changed. Please try again.');
      const token = await tokenSource();
      if (!token) throw new Error('Please sign in again.');
      const status = await call<{ sessionValid: boolean; frozen?: boolean }>('/api/account/pin', { method: 'GET', headers: { authorization: `Bearer ${token}`, 'x-nest-pin': grant.ticket } });
      if (!status.sessionValid) throw new Error('Enter your app PIN to refresh biometric access.');
      if (status.frozen && pending.current) throw new Error('Nest is locked. Cancel this approval, then unlock Nest.');
      setAppPinTicket(grant.ticket);
      if (stateRef.current.mode === 'unlock' && status.frozen) await post(tokenSource, '/api/account/security', { action: 'unfreeze', unlockToken: grant.unlockToken });
      if (activeOwner.current !== owner) throw new Error('Your account changed. Please try again.');
      grantRef.current = { owner, grant }; setState({ owner, mode: 'open', expiresAt: grant.expiresAt });
      if (pending.current) finishApproval();
    } finally { busyRef.current = false; setBusy(false); }
  };
  const setBiometric = async (enabled: boolean) => {
    if (!owner || stateRef.current.mode !== 'open') throw new Error('Sign in to Nest first.');
    if (enabled) {
      const { approvePayment } = await import('../services/approval');
      await approvePayment('Enable biometric approval');
    }
    if (grantRef.current?.owner !== owner) throw new Error('Verify your app PIN first.');
    if (enabled) {
      await enableBiometrics(owner, grantRef.current.grant);
      await storeGrant(owner, null);
    } else {
      // Disabling biometrics is confirmed by a fresh biometric scan, with app PIN fallback.
      const { approvePayment } = await import('../services/approval');
      await approvePayment('Change biometric settings');
      await clearBiometricGrant(owner, true);
      if (grantRef.current?.owner === owner) await storeGrant(owner, grantRef.current.grant);
    }
    if (activeOwner.current === owner) setBio({ owner, value: await biometricStatus(owner) });
  };
  const mode = state.owner === owner ? state.mode : 'loading';
  const approving = approval?.owner === owner && mode === 'open';
  const requestedGate = !!owner && (mode !== 'open' || approving);
  const requestedGateRef = useRef(requestedGate);
  const [presented, setPresented] = useState(false);
  const presentedRef = useRef(false);
  useLayoutEffect(() => { presentedRef.current = presented; }, [presented]);
  useLayoutEffect(() => { requestedGateRef.current = requestedGate; }, [requestedGate]);
  useEffect(() => {
    if (!requestedGate) {
      if (!presentedRef.current) setSecurityGateVisible(false);
      void Promise.resolve().then(() => setPresented(false)); return;
    }
    setSecurityGateVisible(true);
    // Let the underlying sheet dismiss before presenting another native controller.
    const timer = setTimeout(() => setPresented(true), Platform.OS === 'web' ? 0 : 250);
    return () => clearTimeout(timer);
  }, [requestedGate]);
  useEffect(() => () => setSecurityGateVisible(false), []);
  return <Context.Provider value={{ lock, change: (pin, currentPin) => complete('change', pin, currentPin), biometric, setBiometric }}>{children}
    <Modal visible={presented} animationType="none" onDismiss={() => { if (!requestedGateRef.current) setSecurityGateVisible(false); }} onRequestClose={() => { if (approving && !busy) cancelApproval(); }}><PinForm key={`${owner}:${approving ? 'approve' : mode}`} mode={approving ? 'approve' : mode} label={approving ? approval.label : undefined} biometric={biometric.enabled && biometric.available ? biometric.label : undefined} onBiometric={useBiometric} onCancel={approving ? () => cancelApproval() : undefined} busy={busy} serverError={state.owner === owner ? state.error : undefined} onSubmit={pin => complete(mode === 'create' ? 'create' : 'verify', pin)} onRetry={() => setRetry(value => value + 1)} onSignOut={() => { cancelApproval('You signed out.'); void storeGrant(owner, null); void clearBiometricGrant(owner).catch(() => {}); void live.logout(); }} /></Modal>
  </Context.Provider>;
}
export const usePin = () => useContext(Context);
function PinForm({ mode, label, biometric, onBiometric, onCancel, busy, serverError, onSubmit, onRetry, onSignOut }: { mode: Mode; label?: string; biometric?: string; onBiometric: () => Promise<void>; onCancel?: () => void; busy: boolean; serverError?: string; onSubmit: (pin: string) => Promise<void>; onRetry: () => void; onSignOut: () => void }) {
  const { colors, styles: t } = useColors();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const creating = mode === 'create';
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><KeyboardFrame><KeyboardScroll contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, width: '100%', maxWidth: 520, alignSelf: 'center', gap: 18 }}><Brand />
    {mode === 'loading' ? <><ActivityIndicator color={colors.green} /><Text style={t.muted}>Loading your account security…</Text></> : <>
      <Text accessibilityRole="header" style={t.title}>{mode === 'failed' ? 'Could not load your PIN' : creating ? 'Create your app PIN' : mode === 'approve' ? 'Approve payment' : 'Unlock Nest'}</Text>
      {mode === 'failed' ? <><Notice error>{serverError || 'Check your connection and try again.'}</Notice><Button title="Try PIN settings again" onPress={onRetry} /></> : <>
        <Text style={t.muted}>{creating ? 'Choose 6 digits to protect access to Nest. You will use this PIN to unlock your account. Keep it private.' : 'Enter your 6-digit app PIN to continue.'}</Text>
        {label ? <Text style={t.heading}>{label}</Text> : null}
        {biometric ? <Button title={`Use ${biometric}`} disabled={busy} onPress={() => { setError(''); void onBiometric().catch(failure => setError(failure instanceof Error ? failure.message : 'Use your app PIN instead.')); }} /> : null}
        <TextInput accessibilityLabel="App PIN" value={pin} onChangeText={value => { setPin(value.replace(/\D/g, '').slice(0, 6)); setError(''); }} maxLength={6} secureTextEntry keyboardType="number-pad" autoComplete="off" style={[t.card, t.body, { fontSize: 28, letterSpacing: 8 }]} />
        {creating ? <TextInput accessibilityLabel="Confirm app PIN" value={confirm} onChangeText={value => { setConfirm(value.replace(/\D/g, '').slice(0, 6)); setError(''); }} maxLength={6} secureTextEntry keyboardType="number-pad" autoComplete="off" placeholder="Confirm PIN" placeholderTextColor={colors.muted} style={[t.card, t.body, { fontSize: 24 }]} /> : null}
        {error ? <Notice error>{error}</Notice> : null}
        <Button title={creating ? 'Create PIN and continue' : mode === 'approve' ? 'Approve with PIN' : 'Unlock account'} loading={busy} disabled={pin.length !== 6 || creating && confirm.length !== 6} onPress={() => { if (creating && pin !== confirm) { setError('The PINs do not match. Please try again.'); return; } void onSubmit(pin).then(() => { setPin(''); setConfirm(''); }).catch(failure => setError(failure instanceof Error ? failure.message : 'Could not verify the PIN.')); }} />
      </>}
      {onCancel ? <Button title="Cancel approval" variant="secondary" disabled={busy} onPress={onCancel} /> : null}
      <Button title="Sign out" variant="secondary" disabled={busy} onPress={onSignOut} />
    </>}
  </KeyboardScroll></KeyboardFrame></SafeAreaView>;
}
