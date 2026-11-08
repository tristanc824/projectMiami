import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeContacts, updateContact, recentRecipients, matchesRecipient } from '../src/domain/contacts';
import { applyDemoCommand, createInitialWallet, decodeWallet, type Activity } from '../src/domain/wallet';

test('contact names normalize numbers, replace a saved name, and reject invalid input', () => {
  const saved = updateContact([], '(305) 555-0100', '  Alex Rivera  ');
  assert.deepEqual(saved, [{ phone: '+13055550100', name: 'Alex Rivera' }]);
  assert.deepEqual(updateContact(saved, '+13055550100', 'Alex'), [{ phone: '+13055550100', name: 'Alex' }]);
  assert.deepEqual(updateContact(saved, '+13055550100', ''), []);
  assert.throws(() => updateContact(saved, '555', 'Alex'));
  assert.throws(() => updateContact(saved, '+13055550100', 'A'.repeat(41)));
  assert.deepEqual(decodeContacts(JSON.stringify(saved)), saved);
  assert.deepEqual(decodeContacts('not-json'), []);
  assert.deepEqual(decodeContacts(JSON.stringify([{ phone: '555', name: 'Alex' }])), []);
});
test('repeat recipients deduplicate sends, ignore receives, search names and formatted numbers', () => {
  const item: Activity = { id: 'demo-a', kind: 'send', name: '(305) 555-0100', recipientPhone: '+13055550100', amountCents: 1000, feeCents: 0, createdAt: '2026-11-07T12:00:00Z', note: '' };
  const people = recentRecipients([{ ...item, id: 'demo-r', kind: 'receive' }, item, { ...item, id: 'demo-b', createdAt: '2026-11-06T12:00:00Z' }], [{ phone: item.recipientPhone!, name: 'Alex Rivera' }]);
  assert.equal(people.length, 1);
  assert.equal(people[0].paymentCount, 2);
  assert.equal(people[0].lastPaidAt, item.createdAt);
  assert.equal(people[0].initials, 'AR');
  assert.equal(matchesRecipient(people[0], 'aLeX'), true);
  assert.equal(matchesRecipient(people[0], '(305) 555-0100'), true);
  assert.equal(matchesRecipient(people[0], 'someone else'), false);
});
test('Apple Cash and bank demo withdrawals retain their destinations and cannot debit twice', () => {
  const funded = applyDemoCommand(createInitialWallet(), { id: 'demo-funding', kind: 'add', amountCents: 10000, createdAt: '2026-11-07T12:00:00Z' });
  for (const destination of ['bank', 'apple-cash'] as const) {
    const command = { id: `demo-${destination}`, kind: 'withdraw' as const, withdrawalDestination: destination, amountCents: 1000, createdAt: '2026-11-07T12:01:00Z' };
    const next = applyDemoCommand(funded, command);
    assert.equal(next.balanceCents, 8950);
    assert.equal(next.activity[0].withdrawalDestination, destination);
    assert.equal(decodeWallet(JSON.stringify(next)).activity[0].withdrawalDestination, destination);
    assert.equal(applyDemoCommand(next, command), next);
  }
  assert.throws(() => applyDemoCommand(funded, { id: 'demo-invalid-destination', kind: 'send', amountCents: 1000, recipientPhone: '+13055550100', withdrawalDestination: 'apple-cash', createdAt: '2026-11-07T12:01:00Z' }), /destination/);
  const corrupt = { ...funded, activity: [{ ...funded.activity[0], withdrawalDestination: 'apple-cash' }] };
  assert.deepEqual(decodeWallet(JSON.stringify(corrupt)), createInitialWallet());
});
