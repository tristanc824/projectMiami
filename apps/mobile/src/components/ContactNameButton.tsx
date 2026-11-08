import { useState } from 'react';
import { View } from 'react-native';
import { Text, TextInput } from './Text';
import { Button, Notice, Sheet } from './ui';
import { formatPhone } from '../services/dat';
import { useContacts } from '../state/ContactsProvider';
import { useColors } from '../theme';

export function ContactNameButton({ phone }: { phone: string }) {
  const { colors, styles: t } = useColors();
  const { nameFor, saveName, ready } = useContacts();
  const stored = nameFor(phone);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (name: string) => {
    setBusy(true); setError('');
    try { await saveName(phone, name); setOpen(false); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save this name. Please try again.'); }
    finally { setBusy(false); }
  };
  return <>
    <Button title={stored ? 'Edit contact name' : 'Save contact name'} icon="person-add-outline" variant="secondary" disabled={!ready} onPress={() => { setDraft(stored); setError(''); setOpen(true); }} />
    <Sheet title={stored ? 'A familiar name' : 'Put a name to the number'} visible={open} onClose={() => { if (!busy) setOpen(false); }}>
      <Text style={[t.muted, { marginBottom: 16 }]}>{formatPhone(phone)}</Text>
      <TextInput accessibilityLabel="Contact name" placeholder="Their name" placeholderTextColor={colors.muted} value={draft} onChangeText={value => setDraft(value.slice(0, 40))} autoCapitalize="words" autoCorrect={false} returnKeyType="done" style={[t.card, t.body, { marginBottom: 12 }]} />
      <Text style={[t.muted, { marginBottom: 20 }]}>Only you see this name. It’s saved on this device.</Text>
      {error ? <View style={{ marginBottom: 12 }}><Notice error>{error}</Notice></View> : null}
      <Button title="Save name" disabled={!draft.trim() || !ready} loading={busy} onPress={() => { void save(draft); }} />
      {stored ? <Button title="Remove saved name" variant="secondary" disabled={busy} style={{ marginTop: 10 }} onPress={() => { void save(''); }} /> : null}
    </Sheet>
  </>;
}
