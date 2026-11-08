import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { demoPhones, type Contact } from '../domain/wallet';
import { useProfile } from '../state/ProfileProvider';
import { useColors } from '../theme';
import { Text } from './Text';
import { Avatar, Button, Icon, Notice, Sheet } from './ui';

export function EditableAvatar({ contact, size = 76 }: { contact: Pick<Contact, 'id'> & Partial<Pick<Contact, 'initials'>>; size?: number }) {
  const { colors, styles: t } = useColors();
  const profile = useProfile();
  const photoId = demoPhones[contact.id] ?? contact.id;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choose = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      // Older installed development builds may not include the new native module.
      // Load on demand so those builds can still use the rest of Settings.
      let ImagePicker: typeof import('expo-image-picker');
      try { ImagePicker = await import('expo-image-picker'); }
      catch { throw new Error('Photo selection needs an updated version of Nest. Please update the app.'); }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: .35, base64: true, exif: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64 || asset.base64.length > 1_900_000) throw new Error('Choose a smaller photo (under 1.4 MB).');
      await profile.update({ id: photoId, photo: `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` });
      setOpen(false);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save your photo. Try another image.'); }
    finally { setBusy(false); }
  };
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={contact.id === 'self' ? 'Change profile photo' : 'Change contact photo'} disabled={!profile.ready} onPress={() => { setError(''); setOpen(true); }} style={{ minWidth: 44, minHeight: 44 }}>
      <Avatar contact={contact} size={size} />
      <View style={{ position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.surface }}><Icon name="camera-outline" size={14} color={colors.background} /></View>
    </Pressable>
    <Sheet title="Your photo" visible={open} onClose={() => { if (!busy) setOpen(false); }}>
      <Text style={[t.muted, { marginBottom: 20 }]}>Choose a photo to make this space yours. It stays on this device and can be removed anytime.</Text>
      <Button title="Choose photo" icon="image-outline" loading={busy} onPress={() => { void choose(); }} />
      {profile.photos[photoId] ? <Button title="Remove photo" variant="secondary" disabled={busy} style={{ marginTop: 10 }} onPress={() => { setBusy(true); void profile.update({ id: photoId, photo: null }).then(() => setOpen(false)).catch(() => setError('Could not remove your photo. Please try again.')).finally(() => setBusy(false)); }} /> : null}
      {error ? <View style={{ marginTop: 12 }}><Notice error>{error}</Notice></View> : null}
    </Sheet>
  </>;
}
