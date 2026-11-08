export type VoiceLanguage = 'en' | 'es';
export type VoiceContact = { name: string; phone: string };
export type VoiceDraft = { amount: string; phone: string; message: string; cancelled: boolean };
const values: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const spanish: Record<string, number> = { cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900 };
const normalized = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function spanishNumber(raw: string): string | null {
  const text = normalized(raw.trim().replace(/\.$/, ''));
  if (/^\d+(?:[.,]\d{1,2})?$/.test(text)) return text.replace(',', '.');
  const words = text.split(/\s+/); let total = 0, group = 0, last = 1000, thousand = false;
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word === 'y') { if (!(last >= 30 && last <= 90 && last % 10 === 0 && spanish[words[i + 1]] > 0 && spanish[words[i + 1]] < 10)) return null; continue; }
    if (word === 'mil') { if (thousand) return null; total = (group || 1) * 1000; group = 0; last = 1000; thousand = true; continue; }
    const value = spanish[word];
    if (value === undefined || value >= last || (last < 100 && !(last >= 30 && last % 10 === 0 && value < 10 && words[i - 1] === 'y'))) return null;
    group += value; last = value;
  }
  return words.length ? String(total + group) : null;
}
function spokenNumber(raw: string): string | null {
  const clean = raw.trim().replace(/\.$/, '').toLowerCase();
  if (/^\d{1,3}(,\d{3})*(\.\d{1,2})?$|^\d+(\.\d{1,2})?$/.test(clean)) return clean.replace(/,/g, '');
  const parts = clean.replace(/-/g, ' ').split(/\s+/);
  let total = 0, group = 0, previous = '';
  for (const word of parts) {
    if (word === 'and') continue;
    if (word === 'hundred' && group > 0 && group < 10) group *= 100;
    else if (word === 'thousand' && group > 0) { total += group * 1000; group = 0; }
    else if (word in values) {
      if (previous in values && !(values[previous] >= 20 && values[previous] % 10 === 0 && values[word] > 0 && values[word] < 10)) return null;
      group += values[word];
    } else return null;
    previous = word;
  }
  return parts.length ? String(total + group) : null;
}
function parseDraft(transcript: string, contacts: VoiceContact[], selectedPhone = '', language: VoiceLanguage = 'en'): VoiceDraft {
  const text = (language === 'es' ? normalized(transcript) : transcript).trim().slice(0, 2000);
  const base = { amount: '', phone: selectedPhone, message: '', cancelled: false };
  if (/\b(cancel|stop|never mind|nevermind|cancela|cancelar|detener|detente|olvidalo)\b|\b(?:do not|don['’]t|never|no)\s+(?:send|pay|transfer|envies|enviar|envia|pagues|pagar|transfieras|transferir)\b/i.test(text)) return { ...base, cancelled: true, message: 'Cancelled. Nothing has been sent.' };
  if (/\b(cents?|point|instead|actually|rather|centavos?|centimos?|coma|punto|mejor|realidad)\b/i.test(text)) return { ...base, message: 'Please give one clear amount. For cents, type an amount such as 50.25 below.' };
  const match = /\b(?:send|pay|transfer|envia|enviar|mande|manda|paga|pagar|transfiere|transferir)\s+\$?(.+?)(?=\s+(?:dollars?|dolar(?:es)?|usdc|to|for|a|para)\b|$)/i.exec(text);
  if (!match || (text.match(/\b(?:send|pay|transfer|envia|enviar|mande|manda|paga|pagar|transfiere|transferir)\b/gi)?.length ?? 0) !== 1) return { ...base, message: 'Say one payment, for example: Send fifty dollars to Alex.' };
  const remaining = text.slice((match.index ?? 0) + match[0].length);
  if (/\d/.test(remaining)) return { ...base, message: 'I heard additional numbers. Please state just one amount and a saved contact name.' };
  const amount = language === 'es' ? spanishNumber(match[1]) : spokenNumber(match[1]);
  if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > 100000) return { ...base, message: 'I could not safely read one amount. Use digits or say a whole dollar amount.' };
  const recipient = /\b(?:to|a)\s+(.+?)(?=\s+(?:for|para)\b|$)/i.exec(text)?.[1].replace(/[.!?]+$/, '').trim().toLowerCase();
  let phone = selectedPhone;
  if (recipient) {
    const matches = contacts.filter(c => (language === 'es' ? normalized(c.name.trim()) : c.name.trim().toLowerCase()) === recipient);
    if (matches.length !== 1) return { ...base, amount, phone: '', message: matches.length ? 'More than one contact has that name. Choose their number below.' : 'Choose the recipient’s number below. I will not guess who you mean.' };
    phone = matches[0].phone;
  }
  return { amount, phone, cancelled: false, message: phone ? 'Check the amount and recipient before continuing. Nothing has been sent.' : 'Enter the recipient’s number below to finish this draft.' };
}

const esMessages: Record<string, string> = {
  'Cancelled. Nothing has been sent.': 'Cancelado. No se ha enviado dinero.',
  'Please give one clear amount. For cents, type an amount such as 50.25 below.': 'Indica un solo importe. Para centavos, escribe un importe como 50,25.',
  'Say one payment, for example: Send fifty dollars to Alex.': 'Indica un pago, por ejemplo: Envía cincuenta dólares a Alex.',
  'I heard additional numbers. Please state just one amount and a saved contact name.': 'Escuché más números. Indica un solo importe y el nombre de un contacto guardado.',
  'I could not safely read one amount. Use digits or say a whole dollar amount.': 'No pude identificar un solo importe. Usa números o indica dólares enteros.',
  'More than one contact has that name. Choose their number below.': 'Hay varios contactos con ese nombre. Elige su número abajo.',
  'Choose the recipient’s number below. I will not guess who you mean.': 'Escribe el número del destinatario abajo para confirmar a quién deseas pagar.',
  'Check the amount and recipient before continuing. Nothing has been sent.': 'Revisa el importe y el destinatario antes de continuar. No se ha enviado dinero.',
  'Enter the recipient’s number below to finish this draft.': 'Escribe el número del destinatario para completar el borrador.',
};
export function parseVoiceDraft(transcript: string, contacts: VoiceContact[], selectedPhone = '', language: VoiceLanguage = 'en'): VoiceDraft {
  const draft = parseDraft(transcript, contacts, selectedPhone, language);
  return language === 'es' ? { ...draft, message: esMessages[draft.message] || draft.message } : draft;
}
