import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { RequestCode } from '../components/RequestCode';
import { NestMark } from '../components/NestArtwork';
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
  const url = request ? Platform.OS === 'web' ? `${window.location.origin}${process.env.EXPO_BASE_URL || ''}/pay?${new URLSearchParams(request).toString()}` : Linking.createURL('pay', { queryParams: request }) : '';
  const text = cents ? `Nest ${isLive ? 'devnet' : 'demo'} request: ${money(cents)} USDC\n${note}\n${url}` : '';
  const share = async () => {
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) await navigator.share({ title: 'Nest request', text });
        else { await Clipboard.setStringAsync(text); setMessage('Request copied. Paste it into a text message.'); }
      } else await Share.share({ message: text });
    } catch (failure) {
      if (failure instanceof Error && failure.name === 'AbortError') return;
      setMessage('Sharing is unavailable on this device. Try copying the link instead.');
    }
  };
  return <Screen back title="Receive" subtitle="Good things find their way to you.">
    <View style={[t.card, { alignItems: 'center', paddingVertical: 28, marginBottom: 24, gap: 12 }]}>
      <NestMark size={40} /><Text style={t.heading}>Your Nest link</Text>
      {recipient ? <Text style={t.muted}>{formatPhone(recipient)}</Text> : null}
      {url ? <RequestCode value={url} size={208} /> : <View style={{ height: 180, justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: 20 }}><Icon name="qr-code-outline" size={60} color={colors.green} /><Text style={[t.muted, { textAlign: 'center' }]}>Enter your number below{ '\n' }to make your QR code.</Text></View>}
      <Text style={[t.muted, { textAlign: 'center' }]}>{url ? 'One scan. A little closer.' : 'A link to share with your people.'}</Text>
    </View>
    <Text style={[t.muted, { marginBottom: 8 }]}>Amount in dollars</Text><TextInput accessibilityLabel="Request amount" inputMode="decimal" value={amount} onChangeText={setAmount} maxLength={8} style={[t.card, { fontSize: 30, fontWeight: '600', color: colors.ink, marginBottom: 18 }]} />
    {isLive ? <Text style={[t.muted, { marginBottom: 18 }]}>Pay to {formatPhone(live.phone)}</Text> : <><Text style={[t.muted, { marginBottom: 8 }]}>Your phone number</Text><TextInput accessibilityLabel="Your phone number" placeholder="Your phone number" placeholderTextColor={colors.muted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" maxLength={24} style={[t.card, t.body, { marginBottom: 18 }]} /></>}
    <Text style={[t.muted, { marginBottom: 8 }]}>What’s it for?</Text><TextInput accessibilityLabel="Request note" value={note} onChangeText={setNote} maxLength={140} style={[t.card, t.body, { marginBottom: 24 }]} />
    <Notice>{isLive ? 'Share a request for test dollars. They review every detail before sending.' : 'Demo requests only. No real funds move when someone pays this link.'}</Notice>
    {request ? <View style={[t.card, { marginTop: 16 }]}><Text selectable numberOfLines={2} ellipsizeMode="middle" testID="request-link" style={[t.muted, { marginBottom: 12 }]}>{url}</Text><Link href={{ pathname: '/pay', params: request }} style={t.body}>Open request link</Link></View> : null}
    <Button style={{ marginTop: 24 }} title="Share my link" disabled={!request} icon="share-outline" onPress={() => { void share(); }} />
    <Button style={{ marginTop: 10 }} title="Copy link" disabled={!request} variant="secondary" onPress={() => { void Clipboard.setStringAsync(url).then(() => setMessage('Request link copied.')).catch(() => setMessage('Clipboard access is unavailable.')); }} />
    {message ? <Text accessibilityLiveRegion="polite" style={[t.muted, { marginTop: 14, textAlign: 'center' }]}>{message}</Text> : null}<DemoNote />
  </Screen>;
}
