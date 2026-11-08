import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { Button, DemoNote, Icon, Notice, Screen } from '../components/ui';
import { money, parseAmount } from '../domain/wallet';
import { parsePaymentRequest } from '../domain/paymentRequest';
import { formatPhone, normalizePhone } from '../services/dat';
import { useLive } from '../state/live';
import { useColors } from '../theme';

export default function RequestScreen() {
  const { colors, styles: t } = useColors();
  const [amount, setAmount] = useState('50');
  const [note, setNote] = useState('A little something for home');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const live = useLive();
  const isLive = live.status === 'ready';
  const cents = parseAmount(amount);
  const recipient = normalizePhone(isLive ? live.phone : phone);
  const request = parsePaymentRequest({ mode: isLive ? 'devnet' : 'demo', amount, note, recipient: recipient ?? '' });
  const url = request ? Linking.createURL('pay', { queryParams: request }) : '';
  const text = cents ? `Guard ${isLive ? 'devnet' : 'demo'} request: ${money(cents)} USDC\n${note}\n${url}` : '';
  const share = async () => {
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) await navigator.share({ title: 'Guard request', text });
        else { await Clipboard.setStringAsync(text); setMessage('Request copied. Paste it into a text message.'); }
      } else await Share.share({ message: text });
    } catch (failure) {
      if (failure instanceof Error && failure.name === 'AbortError') return;
      setMessage('Sharing is unavailable on this device. Try copying the link instead.');
    }
  };
  return <Screen back title="Good things start here." subtitle="Share a request link with your people.">
    <View style={{ alignItems: 'center', marginVertical: 25 }}><View style={{ width: 90, height: 90, borderRadius: 30, backgroundColor: colors.mintLight, alignItems: 'center', justifyContent: 'center' }}><Icon name="arrow-down-outline" size={38} color={colors.green} /></View></View>
    <Text style={[t.muted, { marginBottom: 8 }]}>Amount in USDC</Text><TextInput accessibilityLabel="Request amount" inputMode="decimal" value={amount} onChangeText={setAmount} maxLength={8} style={[t.card, { fontSize: 30, fontWeight: '600', color: colors.ink, marginBottom: 18 }]} />
    {isLive ? <Text style={[t.muted, { marginBottom: 18 }]}>Pay to {formatPhone(live.phone)}</Text> : <><Text style={[t.muted, { marginBottom: 8 }]}>Your phone number</Text><TextInput accessibilityLabel="Your phone number" placeholder="Your phone number" placeholderTextColor={colors.muted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" maxLength={24} style={[t.card, t.body, { marginBottom: 18 }]} /></>}
    <Text style={[t.muted, { marginBottom: 8 }]}>What’s it for?</Text><TextInput accessibilityLabel="Request note" value={note} onChangeText={setNote} maxLength={140} style={[t.card, t.body, { marginBottom: 24 }]} />
    <Notice>{isLive ? 'This link opens a request to your phone number. The sender reviews and confirms a test USDC payment in Guard.' : 'This link uses the phone number you enter for a demo payment. Demo money stays on the sender’s device.'}</Notice>
    {request ? <View style={[t.card, { marginTop: 16 }]}><Text selectable numberOfLines={2} ellipsizeMode="middle" testID="request-link" style={[t.muted, { marginBottom: 12 }]}>{url}</Text><Link href={{ pathname: '/pay', params: request }} style={t.body}>Open request link</Link></View> : null}
    <Button style={{ marginTop: 24 }} title="Share request" disabled={!request} icon="share-outline" onPress={() => { void share(); }} />
    <Button style={{ marginTop: 10 }} title="Copy link" disabled={!request} variant="secondary" onPress={() => { void Clipboard.setStringAsync(url).then(() => setMessage('Request link copied.')).catch(() => setMessage('Clipboard access is unavailable.')); }} />
    {message ? <Text accessibilityLiveRegion="polite" style={[t.muted, { marginTop: 14, textAlign: 'center' }]}>{message}</Text> : null}<DemoNote />
  </Screen>;
}
