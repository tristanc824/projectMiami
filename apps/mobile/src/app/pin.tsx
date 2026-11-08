import { useState } from 'react';
import { View } from 'react-native';
import { TextInput } from '../components/Text';
import { Button, Notice, Screen } from '../components/ui';
import { usePin } from '../state/PinProvider';
import { useColors } from '../theme';
export default function PinSettings() {
  const { styles: t } = useColors();
  const { change, lock } = usePin();
  const [current, setCurrent] = useState(''), [pin, setPin] = useState(''), [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  return <Screen back title="App PIN" subtitle="Your private 6-digit PIN for Nest."><View style={{ gap: 14 }}>
    {[['Current app PIN', current, setCurrent], ['New app PIN', pin, setPin], ['Confirm new app PIN', confirm, setConfirm]].map(([label, value, setter]) => <TextInput key={label as string} accessibilityLabel={label as string} placeholder={label as string} value={value as string} onChangeText={next => { (setter as (value: string) => void)(next.replace(/\D/g, '').slice(0, 6)); setError(''); setMessage(''); }} secureTextEntry maxLength={6} keyboardType="number-pad" style={[t.card, t.body]} />)}
    {error ? <Notice error>{error}</Notice> : null}{message ? <Notice>{message}</Notice> : null}
    <Button title="Save new PIN" loading={busy} disabled={current.length !== 6 || pin.length !== 6 || confirm.length !== 6} onPress={() => { if (pin !== confirm) { setError('The new PINs do not match.'); return; } setBusy(true); void change(pin, current).then(() => { setCurrent(''); setPin(''); setConfirm(''); setMessage('Your app PIN was changed.'); }).catch(failure => setError(failure instanceof Error ? failure.message : 'Could not change your PIN.')).finally(() => setBusy(false)); }} />
    <Button title="Lock Nest now" variant="secondary" onPress={() => { setError(''); void lock().catch(failure => setError(failure instanceof Error ? failure.message : 'Could not lock Nest.')); }} />
    <Notice>Your app PIN is separate from text-payment and Safe Hold release PINs. Never share it with someone asking for money.</Notice>
  </View></Screen>;
}
