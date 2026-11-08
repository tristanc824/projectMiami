import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { NestMark } from '../components/NestArtwork';
import { Text } from '../components/Text';
import { Button, Detail, Notice, Screen } from '../components/ui';
import { parsePaymentRequest } from '../domain/paymentRequest';
import { money, parseAmount } from '../domain/wallet';
import { formatPhone } from '../services/dat';
import { useLive } from '../state/live';
import { useColors } from '../theme';

export default function PayScreen() {
  const request = parsePaymentRequest(useLocalSearchParams());
  const live = useLive();
  const { colors, styles: t } = useColors();
  const [error, setError] = useState('');
  if (!request) return <Screen back title="Request unavailable"><Notice error>This request link is invalid. Ask for a new link.</Notice><Button style={{ marginTop: 20 }} title="Go home" onPress={() => router.replace('/')} /></Screen>;
  const demo = request.mode === 'demo';
  const recipient = formatPhone(request.recipient);
  const canPay = demo ? live.status === 'off' || live.status === 'signed-out' : live.status === 'ready';
  const openApp = async () => {
    try { await Linking.openURL(`lazo://pay?${new URLSearchParams(request).toString()}`); }
    catch { setError('Open this link on a phone with the Nest development or TestFlight app installed.'); }
  };
  return <Screen back title="A little something requested." subtitle="Check the details before continuing.">
    <View style={[t.card, { marginVertical: 20, backgroundColor: colors.green, paddingVertical: 28 }]}><NestMark size={44} light /><Text style={{ color: colors.background, fontSize: 14, marginTop: 22 }}>From your people.</Text><Text style={[t.title, { marginTop: 8, color: colors.background, fontSize: 54 }]}>{money(parseAmount(request.amount)!)}</Text></View>
    <View style={t.card}>
      <Detail label="To" value={recipient} />
      <Detail label="Network" value={demo ? 'Local demo' : 'Solana devnet'} />
      {request.note ? <Detail label="For" value={request.note} /> : null}
    </View>
    <Notice>{demo ? 'This records a demo payment on the sender’s device only. Add demo money first if your balance is $0.' : 'A request for test dollars. Review every detail before you send.'}</Notice>
    {canPay ? <Button style={{ marginTop: 24 }} title="Continue to payment" onPress={() => router.push({ pathname: '/send', params: { amount: request.amount, note: request.note, phone: request.recipient } })} />
      : !demo && Platform.OS === 'web' ? <Button style={{ marginTop: 24 }} title="Open in Nest" onPress={() => { void openApp(); }} />
      : !demo && live.status !== 'off' ? <Button style={{ marginTop: 24 }} title="Sign in to pay" onPress={() => router.push({ pathname: '/sign-in', params: { paymentRequest: JSON.stringify(request) } })} />
      : <View style={{ marginTop: 16 }}><Notice>{demo ? 'Open this demo link in the web preview or Expo Go to try a demo payment.' : 'Use the Nest development or TestFlight build with live mode configured to pay this request.'}</Notice></View>}
    {demo && canPay ? <Button style={{ marginTop: 10 }} title="Add demo money" variant="secondary" onPress={() => router.push({ pathname: '/money', params: { mode: 'add' } })} /> : null}
    {error ? <View style={{ marginTop: 16 }}><Notice error>{error}</Notice></View> : null}
  </Screen>;
}
