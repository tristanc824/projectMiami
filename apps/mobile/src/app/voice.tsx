import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { Button, Notice, Screen } from '../components/ui';
import { parseVoiceDraft, type VoiceLanguage } from '../domain/voice';
import { contacts as demoContacts, money } from '../domain/wallet';
import { demoPhones } from '../components/RecipientPicker';
import { normalizePhone } from '../services/dat';
import { listen, speak, stopSpeaking } from '../services/voice';
import { useContacts } from '../state/ContactsProvider';
import { useLive } from '../state/live';
import { useColors } from '../theme';

export default function VoiceScreen() {
  const { styles: t, colors } = useColors();
  const params = useLocalSearchParams<{ phone?: string }>();
  const live = useLive();
  const { contacts } = useContacts();
  const book = live.status === 'off' ? [...contacts, ...demoContacts.map(c => ({ name: c.name, phone: demoPhones[c.id] }))] : contacts;
  const [language, setLanguage] = useState<VoiceLanguage>('en');
  const spanish = language === 'es';
  const [text, setText] = useState('');
  const [phone, setPhone] = useState(typeof params.phone === 'string' ? params.phone : '');
  const [phoneEdited, setPhoneEdited] = useState(false);
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const session = useRef<Awaited<ReturnType<typeof listen>> | null>(null);
  const active = useRef(true);
  const opening = useRef(false);
  const shouldRead = useRef(false);
  useEffect(() => {
    active.current = true;
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') { session.current?.dispose(); session.current = null; setListening(false); void stopSpeaking(); } });
    return () => { active.current = false; subscription.remove(); session.current?.dispose(); void stopSpeaking(); };
  }, []);
  const draft = parseVoiceDraft(text, book, normalizePhone(phone) ?? '', language);
  const manualPhone = normalizePhone(phone);
  const namedRecipient = /\b(?:to|a)\s+/i.test(text);
  const recipientConflict = !!manualPhone && !!draft.phone && manualPhone !== draft.phone;
  const target = recipientConflict ? null : namedRecipient ? normalizePhone(draft.phone) || (phoneEdited ? manualPhone : null) : manualPhone || normalizePhone(draft.phone);
  const destination = book.find(c => c.phone === target)?.name ?? target;
  const summary = recipientConflict ? (spanish ? 'El contacto y el número no coinciden. Corrígelos antes de continuar.' : 'The spoken contact and entered number do not match. Correct the name or number before continuing.') : draft.amount && target && !draft.cancelled ? (spanish ? `Tu borrador es de ${money(Math.round(Number(draft.amount) * 100))} para ${destination}. Revisa los datos y confirma en Nest. No se ha enviado dinero.` : `Your draft is ${money(Math.round(Number(draft.amount) * 100))} to ${destination}. Review the details and approve in Nest. Nothing has been sent.`) : draft.message;
  useEffect(() => {
    if (!listening && !starting && shouldRead.current) { shouldRead.current = false; void speak(summary, language).catch(() => { if (active.current) setError('Your draft is ready. Spoken playback is unavailable; read the summary below.'); }); }
  }, [listening, starting, summary, language]);
  useEffect(() => {
    if (!listening) return;
    const timer = setTimeout(() => { session.current?.stop(); }, 30000);
    return () => clearTimeout(timer);
  }, [listening]);
  async function start() {
    if (opening.current || listening) return;
    opening.current = true; setStarting(true); setError('');
    session.current?.dispose(); session.current = null;
    await stopSpeaking();
    let ended = false;
    try {
      const next = await listen({ active: () => active.current && AppState.currentState === 'active', text: value => { if (active.current) { shouldRead.current = true; setText(value.slice(0, 2000)); } }, end: () => { ended = true; if (active.current) setListening(false); }, error: message => { if (active.current) setError(message); } }, language);
      if (!active.current) { next.dispose(); return; }
      session.current = next; setListening(!ended);
    } catch (failure) { if (active.current) setError(failure instanceof Error ? failure.message : 'Voice is unavailable. Type below.'); }
    finally { opening.current = false; if (active.current) setStarting(false); }
  }
  return <Screen back title="Talk to Nest" subtitle="Say it. Check it. Send it." footer={<Button title={spanish ? "Revisar transferencia" : "Review transfer"} disabled={!draft.amount || !target || draft.cancelled || listening || starting} onPress={() => { session.current?.dispose(); void stopSpeaking(); router.replace({ pathname: '/send', params: { phone: target!, amount: draft.amount, voiceTranscript: text } }); }} />}>
    <View accessibilityRole="radiogroup" accessibilityLabel="Voice language" style={[t.row, { gap: 10, marginBottom: 16 }]}>{(['en', 'es'] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={value === 'en' ? 'English' : 'Español'} accessibilityState={{ checked: language === value, disabled: listening || starting }} disabled={listening || starting} onPress={() => { session.current?.dispose(); void stopSpeaking(); shouldRead.current = false; setText(''); setLanguage(value); setError(''); }} style={{ flex: 1, padding: 14, borderRadius: 20, alignItems: 'center', backgroundColor: language === value ? colors.green : colors.surface }}><Text style={{ color: language === value ? colors.white : colors.ink, fontWeight: '600' }}>{value === 'en' ? 'English' : 'Español'}</Text></Pressable>)}</View>
    <View style={[t.card, { gap: 14, marginBottom: 20 }]}>
      <Text style={t.heading}>{listening ? spanish ? 'Escuchando…' : 'Listening…' : spanish ? '¿Cuánto quieres enviar?' : 'What would you like to send?'}</Text>
      <Text style={t.muted}>{spanish ? 'Di “Envía cincuenta dólares a Alex”. Usa el nombre de un contacto guardado o escribe su número abajo.' : 'Try “Send fifty dollars to Alex.” Use a saved contact’s full name, or choose their number below.'}</Text>
      <Button title={listening ? spanish ? 'Terminar' : 'Finish listening' : spanish ? 'Empezar a hablar' : 'Start speaking'} icon={listening ? 'stop' : 'mic-outline'} loading={starting} onPress={() => { if (listening) session.current?.stop(); else void start(); }} />
      <Text style={t.muted}>Your device’s speech service may process audio. Recording starts only when you tap. Voice creates a draft; it never approves a payment.</Text>
    </View>
    {error ? <Notice error>{error}</Notice> : null}
    <TextInput accessibilityLabel="Voice request" placeholder="Your words appear here. You can also type or correct them." multiline maxLength={2000} value={text} onChangeText={setText} editable={!listening && !starting} style={[t.body, { minHeight: 110, padding: 18, borderRadius: 24, backgroundColor: colors.surface, marginVertical: 14 }]} />
    <TextInput accessibilityLabel="Voice recipient phone" placeholder="Recipient phone, including country code" value={phone} onChangeText={value => { setPhone(value); setPhoneEdited(true); }} keyboardType="phone-pad" maxLength={24} style={[t.body, { padding: 18, borderRadius: 24, backgroundColor: colors.surface, marginBottom: 14 }]} />
    {text.trim() ? <Notice>{summary}</Notice> : null}
    <Button style={{ marginTop: 18 }} title={spanish ? "Escuchar resumen" : "Hear summary"} variant="secondary" disabled={!text.trim() || listening || starting} onPress={() => { void speak(summary, language).catch(() => setError('Spoken playback is unavailable in this build. Your draft is still visible above.')); }} />
    <Button style={{ marginTop: 12 }} title={spanish ? "Cancelar solicitud" : "Cancel voice request"} variant="secondary" onPress={() => { session.current?.dispose(); void stopSpeaking(); router.back(); }} />
  </Screen>;
}
