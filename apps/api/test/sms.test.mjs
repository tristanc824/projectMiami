import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { dayKey, parseCommand } from '../lib/sms.mjs';
import { authorizationSignature, canonicalJson, hashPin, checkPin } from '../lib/server/signer.mjs';

test('parses text payment commands', () => {
  assert.deepEqual(parseCommand('send 2 5555550142 pin 4821'), { cmd: 'send', amount: 2_000_000n, phone: '+15555550142', pin: '4821' });
  assert.deepEqual(parseCommand('  SEND $4.50 to (555) 555-0142  PIN 4821 '), { cmd: 'send', amount: 4_500_000n, phone: '+15555550142', pin: '4821' });
  assert.deepEqual(parseCommand('PAY 1 +44 20 7946 0958 PIN 0000'), { cmd: 'send', amount: 1_000_000n, phone: '+442079460958', pin: '0000' });
  assert.deepEqual(parseCommand('bal 4821'), { cmd: 'balance', pin: '4821' });
  assert.deepEqual(parseCommand('BALANCE PIN 4821'), { cmd: 'balance', pin: '4821' });
  assert.deepEqual(parseCommand('help'), { cmd: 'help' });
  assert.deepEqual(parseCommand('Stop'), { cmd: 'stop' });
});

test('malformed commands get a hint and ordinary texts are ignored', () => {
  for (const bad of ['SEND 2 5550142 PIN 4821', 'SEND 0 5555550142 PIN 4821', 'SEND 2 5555550142', 'SEND 2.555 5555550142 PIN 4821', 'BAL', 'BAL 12'])
    assert.equal(parseCommand(bad).cmd, 'invalid', bad);
  for (const chat of ['', 'hey are you coming tonight?', 'Sending you the photos now', 'balanced breakfast'])
    assert.equal(parseCommand(chat), null, chat);
});

test('daily totals use the Eastern calendar day', () => {
  assert.equal(dayKey(new Date('2026-11-08T03:00:00Z')), '2026-11-07');
  assert.equal(dayKey(new Date('2026-11-08T06:00:00Z')), '2026-11-08');
});

test('canonical JSON sorts keys and matches RFC 8785 for plain values', () => {
  assert.equal(canonicalJson({ b: 1, a: [true, null, 'x'], c: { z: 'é', y: 1.5 } }), '{"a":[true,null,"x"],"b":1,"c":{"y":1.5,"z":"é"}}');
});

test('authorization signatures verify with the matching public key', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const key = `wallet-auth:${privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64')}`;
  const input = { method: 'POST', url: 'https://api.privy.io/v1/wallets/w1/rpc', body: { method: 'signTransaction' }, appId: 'app' };
  const sig = authorizationSignature(input, key);
  const payload = canonicalJson({ version: 1, method: 'POST', url: input.url, body: input.body, headers: { 'privy-app-id': 'app' } });
  assert.ok(verify('sha256', Buffer.from(payload), publicKey, Buffer.from(sig, 'base64')));
});

test('PINs are salted and checked without storing them', () => {
  const stored = hashPin('4821');
  assert.ok(!stored.includes('4821'));
  assert.notEqual(hashPin('4821'), stored);
  assert.ok(checkPin('4821', stored));
  assert.ok(!checkPin('4822', stored));
  assert.ok(!checkPin('4821', 'garbage'));
});
