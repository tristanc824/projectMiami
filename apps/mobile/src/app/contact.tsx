import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { ContactNameButton } from '../components/ContactNameButton';
import { Text } from '../components/Text';
import { EditableAvatar } from '../components/EditableAvatar';
import { Button, Notice, Screen } from '../components/ui';
import { contactInitials } from '../domain/contacts';
import type { Contact } from '../domain/wallet';
import { formatPhone, normalizePhone } from '../services/dat';
import { useContacts } from '../state/ContactsProvider';
import { useColors } from '../theme';

export default function ContactScreen() {
  const { phone: input } = useLocalSearchParams<{ phone: string }>();
  const { nameFor } = useContacts();
  const { styles: t } = useColors();
  const phone = normalizePhone(typeof input === 'string' ? input : '');
  if (!phone) return <Screen back title="Contact unavailable"><Notice>Choose a person from your contacts.</Notice></Screen>;
  const savedName = nameFor(phone);
  return <Screen back title="Contact"><View style={[t.card, { alignItems: 'center', gap: 14, paddingVertical: 30, marginBottom: 24 }]}><EditableAvatar contact={{ id: phone, initials: savedName ? contactInitials(savedName) : '#' } as Contact} size={80} /><Text testID="contact-display-name" style={t.heading}>{savedName || formatPhone(phone)}</Text>{savedName ? <Text style={t.muted}>{formatPhone(phone)}</Text> : null}</View><View style={{ gap: 12 }}><Button title="Send money" icon="arrow-forward" onPress={() => router.push({ pathname: '/send', params: { phone } })} /><Button title="Create payment link" icon="link-outline" variant="secondary" onPress={() => router.push({ pathname: '/request', params: { payTo: phone } })} /><ContactNameButton phone={phone} /></View></Screen>;
}
