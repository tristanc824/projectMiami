import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { Button, DemoNote, Icon, Notice, Screen } from '../components/ui';
import { money, parseAmount } from '../domain/wallet';
import { useColors } from '../theme';

export default function RequestScreen() {
  const { colors, styles: t } = useColors();
  const [amount, setAmount] = useState('50');
  const [note, setNote] = useState('A little something for home');
  const [message, setMessage] = useState('');
  const cents = parseAmount(amount);
  const text = cents ? `Guard demo request: ${money(cents)} USDC\n${note}\nThis is a prototype request, not a payment link. No real funds can be sent through this message.` : '';
  return <Screen back title="Good things start here." subtitle="Preview a request you can share with your people.">
    <View style={{ alignItems: 'center', marginVertical: 25 }}><View style={{ width: 90, height: 90, borderRadius: 30, backgroundColor: colors.mintLight, alignItems: 'center', justifyContent: 'center' }}><Icon name="arrow-down-outline" size={38} color={colors.green} /></View></View>
    <Text style={[t.muted, { marginBottom: 8 }]}>Amount in USDC</Text><TextInput accessibilityLabel="Request amount" inputMode="decimal" value={amount} onChangeText={setAmount} maxLength={8} style={[t.card, { fontSize: 30, fontWeight: '600', color: colors.ink, marginBottom: 18 }]} />
    <Text style={[t.muted, { marginBottom: 8 }]}>What’s it for?</Text><TextInput accessibilityLabel="Request note" value={note} onChangeText={setNote} maxLength={140} style={[t.card, t.body, { marginBottom: 24 }]} />
    <Notice>Shareable text preview only. This does not create a payable request, a QR payment code, or a real wallet address.</Notice>
    <Button style={{ marginTop: 24 }} title="Share demo request" disabled={!cents} icon="share-outline" onPress={() => { void Share.share({ message: text }).catch(() => setMessage('Sharing is unavailable on this device. Try copying instead.')); }} />
    <Button style={{ marginTop: 10 }} title="Copy request" disabled={!cents} variant="secondary" onPress={() => { void Clipboard.setStringAsync(text).then(() => setMessage('Demo request copied.')).catch(() => setMessage('Clipboard access is unavailable.')); }} />
    {message ? <Text accessibilityLiveRegion="polite" style={[t.muted, { marginTop: 14, textAlign: 'center' }]}>{message}</Text> : null}<DemoNote />
  </Screen>;
}
