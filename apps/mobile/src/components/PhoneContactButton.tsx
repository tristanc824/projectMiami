import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Text } from './Text';
import { Button, Notice, Sheet } from './ui';
import { formatPhone, normalizePhone } from '../services/dat';
import { useContacts } from '../state/ContactsProvider';
import { useColors } from '../theme';

type Choice = { phone: string; name: string };
/** System picker reads one chosen person. The address book is never uploaded. */
export function PhoneContactButton({ onSelect }: { onSelect: (phone: string) => void }) {
  const saved = useContacts();
  const { styles: t } = useColors();
  const [choices, setChoices] = useState<Choice[]>([]);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const select = async (choice: Choice) => {
    setBusy(true); setError('');
    try { await saved.saveName(choice.phone, choice.name); setChoices([]); onSelect(choice.phone); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save this contact.'); }
    finally { setBusy(false); }
  };
  const choose = async () => {
    setBusy(true); setError(''); setDenied(false);
    try {
      // SDK 58 keeps the functional compatibility API under /legacy.
      const contacts = await import('expo-contacts/legacy');
      const permission = await contacts.requestPermissionsAsync();
      if (!permission.granted) { setDenied(true); setError('Contact access is off. Allow access in your phone settings, or enter a number manually.'); return; }
      const person = await contacts.presentContactPickerAsync();
      if (!person) return;
      const numbers = [...new Set((person.phoneNumbers ?? []).map(item => normalizePhone(item.number ?? '')).filter((phone): phone is string => !!phone))];
      const name = (person.name || [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Phone contact').trim().slice(0, 40);
      if (!numbers.length) { setError('This contact has no usable phone number. Add the country code in your phone contacts, or enter it manually.'); return; }
      const items = numbers.map(phone => ({ phone, name }));
      // Confirm even single numbers before saving them as trusted contacts.
      setChoices(items);
    } catch { setError('Phone contacts are unavailable in this build. Update the Nest app, or enter a number manually.'); }
    finally { setBusy(false); }
  };
  if (Platform.OS === 'web') return null;
  return <View style={{ gap: 10, marginBottom: 20 }}><Button title="Choose from phone contacts" icon="people-outline" variant="secondary" loading={busy} disabled={!saved.ready} onPress={() => { void choose(); }} /><Text style={t.muted}>Optional. Only the person you choose is saved on this device.</Text>
    {error ? <Notice error>{error}</Notice> : null}{denied ? <Button title="Open phone settings" variant="light" onPress={() => { void Linking.openSettings().catch(() => setError('Open Settings on your phone and allow Nest to access contacts.')); }} /> : null}
    <Sheet visible={choices.length > 0} title="Save this contact" onClose={() => { if (!busy) setChoices([]); }}><Text style={[t.muted, { marginBottom: 18 }]}>Choose their Nest phone number. Saving it makes them a known contact for future payments.</Text>{choices.map(item => <Button key={item.phone} style={{ marginBottom: 12 }} title={`${item.name} · ${formatPhone(item.phone)}`} loading={busy} onPress={() => { void select(item); }} />)}{error ? <Notice error>{error}</Notice> : null}</Sheet>
  </View>;
}
