import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { Button, DemoNote, Detail, Icon, Notice, Pill, Screen } from '../components/ui';
import { formatPhone, textPaymentLink } from '../services/dat';
import { useLive } from '../state/live';
import { useColors } from '../theme';

const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

/** Text payments: send and check your balance by SMS from any phone with a signal, with no Wi-Fi or data. */
export default function TextPaymentsScreen() {
  const { colors, styles: t } = useColors();
  const live = useLive();
  const settings = live.textPayments;
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await work(); setPin(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'That did not work. Please try again.'); }
    finally { setBusy(false); }
  };
  const command = (line: string, meaning: string) => <View style={{ paddingVertical: 8 }}><Text selectable style={[t.body, { fontWeight: '600', color: colors.ink }]}>{line}</Text><Text style={t.muted}>{meaning}</Text></View>;

  let body;
  if (live.status !== 'ready') {
    body = <><Notice>{live.status === 'off' ? 'Text payments need a real Nest wallet, in the Nest app build with live mode turned on.' : 'Sign in with your phone number to use text payments.'}</Notice>
      {live.status === 'signed-out' ? <Button style={{ marginTop: 14 }} title="Sign in with phone" onPress={() => router.push('/sign-in')} /> : null}</>;
  } else if (!settings) {
    body = <Text style={t.muted}>Loading…</Text>;
  } else if (!settings.available) {
    body = <Notice>Text payments aren’t set up on the Nest server yet.</Notice>;
  } else if (settings.on) {
    body = <>
      <View style={t.card}>
        <View style={[t.row, { gap: 10, marginBottom: 12 }]}><Icon name="chatbubble-ellipses-outline" color={colors.green} /><Text style={t.heading}>Text payments are on</Text></View>
        <Detail label="Text this number" value={formatPhone(settings.number)} strong />
        <Detail label="Each payment" value={`Up to ${money(settings.perPaymentCents)}`} />
        <Detail label="Each day" value={`Up to ${money(settings.perDayCents)}`} />
      </View>
      <View style={[t.card, { marginTop: 18 }]}>
        <Text style={[t.heading, { marginBottom: 6 }]}>What to text</Text>
        {command('SEND 5 5555550142 PIN 4821', 'Sends $5 to that number. Use your PIN in place of 4821.')}
        {command('BAL 4821', 'Texts back your balance.')}
        {command('HELP', 'Lists these commands.')}
        {command('STOP', 'Turns text payments off until you turn them on here.')}
      </View>
      <Button style={{ marginTop: 18 }} title="Open Messages" icon="chatbubble-outline" onPress={() => { void Linking.openURL(textPaymentLink(settings.number, 'SEND ')).catch(() => setError('Messages could not be opened.')); }} />
      <Button style={{ marginTop: 10 }} title="Turn off text payments" variant="secondary" loading={busy} onPress={() => { void run(live.disableTextPayments); }} />
    </>;
  } else {
    body = <>
      <View style={t.card}>
        <Text style={t.heading}>How it works</Text>
        <Text style={[t.body, { marginTop: 8 }]}>When you have a signal but no Wi-Fi or data, text Nest’s number to send money or check your balance. It works from any phone, even one without the app.</Text>
        <Text style={[t.body, { marginTop: 8 }]}>Turning this on lets Nest’s server send from your wallet, but only USDC, only when a text from your number has your PIN, and only up to {money(settings.perPaymentCents)} a payment and {money(settings.perDayCents)} a day. Turn it off here any time.</Text>
      </View>
      <Text style={[t.heading, { marginTop: 22, marginBottom: 10 }]}>Choose a text PIN</Text>
      <TextInput accessibilityLabel="Text payments PIN" testID="text-pin" value={pin} onChangeText={value => { setPin(value.replace(/\D/g, '').slice(0, 4)); setError(''); }} placeholder="4 digits" placeholderTextColor={colors.muted} keyboardType="number-pad" secureTextEntry maxLength={4} style={[t.body, { padding: 17, backgroundColor: colors.surface, borderRadius: 28 }]} />
      <Text style={[t.muted, { marginTop: 8 }]}>Different from your phone’s passcode. Five wrong PINs turn text payments off.</Text>
      <Button style={{ marginTop: 18 }} title="Turn on text payments" loading={busy} disabled={pin.length !== 4} onPress={() => { void run(() => live.enableTextPayments(pin)); }} />
    </>;
  }

  return <Screen back title="Send without data" subtitle="Text Nest from any phone with a signal.">
    {live.status === 'ready' && settings?.on ? <View style={{ marginBottom: 14, alignSelf: 'flex-start' }}><Pill>On · SMS</Pill></View> : null}
    {body}
    {error ? <View style={{ marginTop: 14 }}><Notice error>{error}</Notice></View> : null}
    <Text style={[t.muted, { marginTop: 18 }]}>Works with a cellular signal, not in airplane mode. Payments are test USDC on Solana devnet.</Text>
    <DemoNote />
  </Screen>;
}
