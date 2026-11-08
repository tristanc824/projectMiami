import assert from 'node:assert/strict';
import test from 'node:test';
import { buildVoiceReviewRequest, redactRecipientName, voiceDraftFromReview } from '../src/services/review';

const recipient = { phone: '+15555550142', displayName: 'Mamá', spokenName: 'mami', inContacts: true };

test('voice review sends no user id, contact name, or phone number to the AI service', () => {
  const request = buildVoiceReviewRequest('Send thirty five dollars to mami', 'es-AR', recipient);
  assert.equal(request.locale, 'es-US');
  assert.equal(request.mode, 'voice_send');
  assert.deepEqual(request.case, { standalone_transfer: true, recipient_in_contacts: true });
  assert.equal(JSON.stringify(request).includes(recipient.phone), false);
  assert.equal(JSON.stringify(request).toLocaleLowerCase().includes('mami'), false);
  assert.equal(request.transcript, 'Send thirty five dollars to recipient');
  assert.equal('user_id' in request, false);
});

test('the contact name is replaced as a whole word, with or without accents', () => {
  const ana = { phone: '+15555550100', displayName: 'Ana', inContacts: true };
  assert.equal(redactRecipientName('Send Ana 20 dollars for bananas', ana), 'Send recipient 20 dollars for bananas');
  assert.equal(redactRecipientName('ANA needs 20, ana.', ana), 'recipient needs 20, recipient.');
  const mama = { phone: '+15555550101', displayName: 'Mamá', inContacts: true };
  assert.equal(redactRecipientName('Send mama 50 dollars', mama), 'Send recipient 50 dollars');
  assert.equal(redactRecipientName('Envía 50 dólares a mamá', mama), 'Envía 50 dólares a recipient');
  const rosa = { phone: '+15555550102', displayName: 'Tía Rosa', spokenName: 'Rosa', inContacts: true };
  assert.equal(redactRecipientName('Manda 30 a tia rosa y a Rosalinda', rosa), 'Manda 30 a recipient y a Rosalinda');
  assert.equal(redactRecipientName('Send 30 to Rosa', null), 'Send 30 to Rosa');
});

test('review response becomes typed-send params but never sends by itself', () => {
  const draft = voiceDraftFromReview({
    assistant: { status: 'Ready', explanation: 'The details are filled in. Nothing has been sent yet.', in_your_language: 'Revisa los detalles.', language: 'Spanish', filled: {}, needs: [], next_step: 'Review it.' },
    case: { amount_usdc: '35', purpose: 'school supplies', signals: ['amount_read_from_words'] },
    signals: [{ code: 'amount_read_from_words', level: 'low', text: 'Read it back.' }],
    verdict: { decision: 'confirm' },
    hold_policy: { required: false },
  }, recipient);
  assert.equal(draft.state, 'ready');
  assert.equal(draft.readback, 'Send $35.00 to Mamá?');
  assert.deepEqual(draft.sendParams, { phone: recipient.phone, amount: '35.00', note: 'school supplies' });
  assert.match(draft.explanation, /Nothing has been sent/i);
});

test('missing facts or a Safe Hold never produce send params', () => {
  const missing = voiceDraftFromReview({ case: { amount_usdc: '80', signals: ['amount_guessed'] }, signals: [{ code: 'amount_guessed', level: 'high', text: 'Confirm it.' }] }, recipient);
  assert.equal(missing.state, 'clarify');
  assert.equal(missing.sendParams, null);
  const held = voiceDraftFromReview({ case: { amount_usdc: '80' }, assistant: { status: 'Hold', explanation: 'Nothing was sent.', in_your_language: 'Nada fue enviado.', language: 'Spanish', filled: {}, needs: [], next_step: 'Wait.' }, verdict: { decision: 'hold' }, hold_policy: { required: true } }, recipient);
  assert.equal(held.state, 'hold');
  assert.equal(held.sendParams, null);
});
