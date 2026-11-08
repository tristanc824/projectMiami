import type { VoiceLanguage } from '../domain/voice';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

export async function listen(callbacks: { text: (text: string) => void; end: () => void; error: (message: string) => void; active: () => boolean }, language: VoiceLanguage = 'en') {
  if (Platform.OS !== 'web' && !requireOptionalNativeModule('ExpoSpeechRecognition')) throw new Error('Voice needs the updated Nest development build. You can type your request below for now.');
  const { ExpoSpeechRecognitionModule: speech } = await import('expo-speech-recognition');
  if (!speech.isRecognitionAvailable()) throw new Error('Speech recognition is unavailable here. Try Chrome or the updated Nest app, or type below.');
  const permission = await speech.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Microphone and speech permission are needed. Enable them in Settings, or type below.');
  if (!callbacks.active()) throw new Error('Voice was interrupted. Tap Start speaking to try again.');
  const subscriptions = [
    speech.addListener('result', event => { const text = event.results[0]?.transcript; if (text) callbacks.text(text); }),
    speech.addListener('end', callbacks.end),
    speech.addListener('error', event => { if (event.error !== 'aborted') callbacks.error(event.error === 'no-speech' ? 'I did not hear anything. Try again or type below.' : 'Voice recognition stopped. Check microphone permission and your connection, then try again.'); callbacks.end(); }),
  ];
  try { speech.start({ lang: language === 'es' ? 'es-MX' : 'en-US', interimResults: true, continuous: false, maxAlternatives: 1 }); }
  catch (error) { subscriptions.forEach(s => s.remove()); throw error; }
  return { stop: () => speech.stop(), dispose: () => { subscriptions.forEach(s => s.remove()); speech.abort(); } };
}
let speechRequest = 0;
export async function speak(text: string, language: VoiceLanguage = 'en') {
  const request = ++speechRequest;
  const speech = await import('expo-speech');
  if (request !== speechRequest) return;
  await speech.stop();
  if (request !== speechRequest) return;
  speech.speak(text, { language: language === 'es' ? 'es-MX' : 'en-US', rate: 0.95 });
}
export async function stopSpeaking() {
  speechRequest++;
  try { const speech = await import('expo-speech'); await speech.stop(); } catch { /* Old builds can still use typed drafts. */ }
}
