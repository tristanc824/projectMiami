import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVoiceDraft } from '../src/domain/voice';
const contacts = [{ name: 'Alex', phone: '+13055550123' }];
test('voice drafts preserve fifty and decimal amounts without sending', () => {
  for (const text of ['Send fifty dollars to Alex', 'Send 50 to Alex', 'Pay $50 dollars to Alex']) {
    const draft = parseVoiceDraft(text, contacts); assert.equal(draft.amount, '50'); assert.equal(draft.phone, contacts[0].phone);
  }
  assert.equal(parseVoiceDraft('Transfer 50.25 dollars to Alex', contacts).amount, '50.25');
  assert.equal(parseVoiceDraft('Send one thousand five hundred dollars to Alex', contacts).amount, '1500');
});
test('voice rejects cancellation, conflicting amounts, unknown recipients and duplicate names', () => {
  for (const text of ["Don't send fifty to Alex", 'Stop send fifty dollars to Alex', 'Never mind', 'Do not transfer fifty dollars', "Don't pay fifty dollars"]) assert.equal(parseVoiceDraft(text, contacts).cancelled, true);
  for (const text of ['Send 50 500 to Alex', 'Send five dollars and fifty cents to Alex', 'Send 50 actually 500 dollars to Alex', 'Send fifty fifty dollars to Alex', 'Send 0 to Alex', 'Send 100001 to Alex', 'Send 50 to Alex and pay 20 to Sam']) assert.equal(parseVoiceDraft(text, contacts).amount, '');
  assert.equal(parseVoiceDraft('Send fifty to Sam', contacts).phone, '');
  assert.equal(parseVoiceDraft('Send fifty to Alex', [...contacts, { name: 'Alex', phone: '+13055550456' }]).phone, '');
  assert.equal(parseVoiceDraft('Send fifty dollars', contacts, contacts[0].phone).phone, contacts[0].phone);
});
test('Spanish commands parse exact spoken amounts, accented contacts and decimal commas', () => {
  const spanishContacts = [{ name: 'José', phone: '+13055550123' }];
  for (const [text, amount] of [['Envía cincuenta dólares a José', '50'], ['Enviar un dólar a José', '1'], ['Paga treinta y cinco dólares a José', '35'], ['Transfiere doscientos cincuenta dólares a José', '250'], ['Envía mil dólares a José', '1000'], ['Envía 50,25 dólares a José', '50.25']]) {
    const draft = parseVoiceDraft(text, spanishContacts, '', 'es'); assert.equal(draft.amount, amount, text); assert.equal(draft.phone, spanishContacts[0].phone, text);
  }
});
test('Spanish cancellations and ambiguous amounts cannot become payments', () => {
  for (const text of ['Cancela', 'No envíes cincuenta dólares', 'No pagues cincuenta dólares']) assert.equal(parseVoiceDraft(text, [], '', 'es').cancelled, true);
  for (const text of ['Envía cincuenta cincuenta dólares', 'Envía cinco dólares y cincuenta centavos', 'Envía 50 500 dólares', 'Envía mil mil dólares', 'Envía cero dólares', 'Envía uno dos dólares']) assert.equal(parseVoiceDraft(text, [], '', 'es').amount, '', text);
});
