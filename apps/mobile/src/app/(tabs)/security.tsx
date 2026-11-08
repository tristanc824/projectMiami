import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { Text, TextInput } from '../../components/Text';
import { Button, DemoNote, Icon, Notice, Screen, Sheet, type IconName } from '../../components/ui';
import { call, formatPhone, normalizePhone, post, textPaymentLink } from '../../services/dat';
import { approvePayment } from '../../services/approval';
import { reviewEnabled } from '../../services/review';
import { useContacts } from '../../state/ContactsProvider';
import { usePin } from '../../state/PinProvider';
import { useLive } from '../../state/live';
import { useColors } from '../../theme';

type Security = { frozen: boolean; trustedContact: { name: string; phone: string } | null; recoveryAvailable: boolean };
export default function SecurityScreen() {
  const { colors, styles: t } = useColors();
  const live = useLive();
  const { contacts } = useContacts();
  const pin = usePin();
  const connected = live.status === 'ready';
  const { address, getAccessToken } = live;
  const [security, setSecurity] = useState<{ owner: string; value: Security } | null>(null);
  const current = security?.owner === live.address ? security.value : null;
  const [selected, setSelected] = useState<'biometric' | 'scam' | 'trusted' | 'support' | null>(null);
  const [name, setName] = useState(''), [phone, setPhone] = useState('');
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    if (!connected) return;
    const token = await getAccessToken();
    if (!token) throw new Error('Please sign in again.');
    const value = await call<Security>('/api/account/security', { method: 'GET', headers: { authorization: `Bearer ${token}` } });
    setSecurity({ owner: address, value });
  }, [connected, address, getAccessToken]);
  useEffect(() => { void Promise.resolve().then(refresh).catch(() => {}); }, [refresh]);
  const work = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await task(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not update security. Please try again.'); }
    finally { setBusy(false); }
  };
  const openLink = async (url: string) => {
    try { await Linking.openURL(url); } catch { setError('Could not open your phone or messages app on this device.'); }
  };
  const row = (title: string, status: string, icon: IconName, onPress: () => void) => <Pressable key={title} accessibilityRole="button" accessibilityLabel={`${title}, ${status}`} onPress={() => { setError(''); setMessage(''); onPress(); }} style={[t.row, { gap: 13, paddingVertical: 18 }]}>
    <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} color={colors.green} size={20} /></View>
    <View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '500' }}>{title}</Text><Text style={[t.muted, { marginTop: 4 }]}>{status}</Text></View><Icon name="chevron-forward" size={17} color={colors.muted} />
  </Pressable>;
  return <Screen title="Security" subtitle="Your money. Your say.">
    <View style={[t.card, { paddingVertical: 0, marginTop: 12 }]}>
      {row(pin.biometric.label, pin.biometric.enabled ? 'On · payments and security changes' : Platform.OS === 'web' ? 'Available in the mobile app' : 'Set up on this device', 'scan-outline', () => setSelected('biometric'))}<View style={t.divider} />
      {row('Scam check', connected ? reviewEnabled ? 'On for unfamiliar recipients' : 'Not enabled in this build' : 'Sign in to check payments', 'shield-checkmark-outline', () => setSelected('scam'))}<View style={t.divider} />
      {row('Safe Holds', 'Check availability and manage held payments', 'arrow-undo-outline', () => router.push('/hold'))}<View style={t.divider} />
      {row('Trusted contact', current?.trustedContact ? `${current.trustedContact.name} · recovery setup pending` : 'Choose someone you trust', 'heart-outline', () => { setName(current?.trustedContact?.name || ''); setPhone(current?.trustedContact?.phone || ''); setSelected('trusted'); })}
    </View>
    <View style={{ marginTop: 22, gap: 12 }}>
      <Button title="Lock Nest" icon="lock-closed-outline" disabled={!connected} loading={busy} onPress={() => { void work(async () => { await pin.lock(); }); }} />
      <Text style={t.muted}>Freeze outgoing payments through Nest, including text payments. Unlock with your app PIN or biometrics to resume. Payments already sent cannot be stopped.</Text>
      <Button title="Manage app PIN" variant="secondary" disabled={!connected} onPress={() => router.push('/pin')} />
      <Button title="Help and support" variant="secondary" onPress={() => setSelected('support')} />
    </View>
    {selected === null && error ? <Notice error>{error}</Notice> : null}{selected === null && message ? <Notice>{message}</Notice> : null}<DemoNote />
    {selected !== null ? <Sheet title={selected === 'biometric' ? pin.biometric.label : selected === 'scam' ? 'Scam check' : selected === 'trusted' ? 'Trusted contact' : 'Here to help'} visible={selected !== null} onClose={() => { if (!busy) setSelected(null); }}>
      {selected === 'biometric' ? <><Text style={[t.body, { marginBottom: 18 }]}>Use your face or fingerprint to approve each send, Safe Hold action and security change. Returning to Nest does not ask again. Your app PIN is always available as a fallback.</Text>{Platform.OS === 'web' ? <Notice>Set up biometrics in the Nest mobile app. Browser payments use your app PIN.</Notice> : <><Notice>{pin.biometric.available ? 'Biometrics are ready on this device.' : 'Set up biometrics in your phone settings and install the latest Nest build.'}</Notice><Button style={{ marginTop: 18 }} title={pin.biometric.enabled ? 'Turn off biometrics' : 'Enable biometrics'} disabled={!connected || !pin.biometric.enabled && !pin.biometric.available} loading={busy} onPress={() => { setSelected(null); void work(async () => { await pin.setBiometric(!pin.biometric.enabled); setMessage(pin.biometric.enabled ? 'Biometrics are off. Use your app PIN.' : 'Biometrics are on for payments and security changes.'); }); }} /></>}</> : null}
      {selected === 'scam' ? <><Text style={[t.body, { marginBottom: 18 }]}>Swarms reviews unfamiliar recipients and unusual payment details. Prune handles the review handoff. If the review flags a payment, Nest offers a 24-hour on-chain Safe Hold. Saved contacts and people you have paid before go straight through after you confirm.</Text><Notice>Review errors stop the payment. A clean review cannot guarantee that a recipient is safe. Check the number and amount before approving.</Notice></> : null}
      {selected === 'trusted' ? <View style={{ gap: 14 }}>
        <Notice>Contact-only account recovery is not available yet. Saving someone here does not let them restore your wallet or sign in for you.</Notice>
        {current?.trustedContact ? <><Text style={t.heading}>{current.trustedContact.name}</Text><Text style={t.muted}>{formatPhone(current.trustedContact.phone)}</Text><View style={[t.row, { gap: 10 }]}><Button title="Call contact" variant="secondary" style={{ flex: 1 }} onPress={() => { void openLink(`tel:${current.trustedContact!.phone}`); }} /><Button title="Text contact" variant="secondary" style={{ flex: 1 }} onPress={() => { void openLink(textPaymentLink(current.trustedContact!.phone, 'Can you help me check a payment in Nest? Please call me on the number you already have saved.', Platform.OS)); }} /></View></> : null}
        {contacts.length ? <><Text style={t.muted}>Choose a saved contact</Text>{contacts.slice(0, 8).map(contact => <Button key={contact.phone} title={`${contact.name} · ${formatPhone(contact.phone)}`} variant="secondary" onPress={() => { setName(contact.name); setPhone(contact.phone); }} />)}</> : null}
        <TextInput accessibilityLabel="Trusted contact name" placeholder="Their name" value={name} onChangeText={setName} maxLength={60} style={[t.card, t.body]} />
        <TextInput accessibilityLabel="Trusted contact phone" placeholder="Phone number with country code" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={[t.card, t.body]} />
        <Button title="Save trusted contact" disabled={!connected || !name.trim() || !normalizePhone(phone)} loading={busy} onPress={() => {
          setSelected(null);
          void work(async () => { await approvePayment('Save trusted contact'); await post(live.getAccessToken, '/api/account/security', { action: 'trusted-contact', name: name.trim(), phone: normalizePhone(phone) }); await refresh(); setMessage('Contact saved. Account recovery still requires provider setup.'); });
        }} />
        {current?.trustedContact ? <Button title="Remove trusted contact" variant="secondary" loading={busy} onPress={() => { setSelected(null); void work(async () => { await approvePayment('Remove trusted contact'); await post(live.getAccessToken, '/api/account/security', { action: 'remove-trusted-contact' }); await refresh(); setMessage('Trusted contact removed.'); }); }} /> : null}
        <Text style={t.muted}>Choose someone with their own Nest account. Ask them before saving their number.</Text>
      </View> : null}
      {selected === 'support' ? <><Text style={[t.body, { marginBottom: 18 }]}>For a problem with a test payment, keep the transaction reference from your receipt and contact the Nest demo team.</Text><Notice>Never share a sign-in code, private key, or recovery phrase.</Notice><Button title="View my activity" style={{ marginTop: 18 }} onPress={() => { setSelected(null); router.push('/activity'); }} /></> : null}
      {error ? <Notice error>{error}</Notice> : null}{message ? <Notice>{message}</Notice> : null}
      <Button title="Done" variant="secondary" style={{ marginTop: 18 }} disabled={busy} onPress={() => setSelected(null)} />
    </Sheet> : null}
  </Screen>;
}
