import assert from 'node:assert/strict';
import test from 'node:test';
import { checkPreparedTransfer, isAllowedApiUrl } from '../src/services/dat';

// Messages built by apps/api/lib/tx.mjs buildTransferMessage (devnet USDC, 5 USDC = 500 cents),
// plus tampered variants. Regenerate them with @solana/web3.js if the server's layout changes.
const F = {
  owner: 'GyfFHe77pcZtdgGnWGw4T1VxCPB6JJyGLfjzMagDdsz3',
  recipient: '8u8LCMQvMKrFxHbn326Ltcqv72HDPEC5FPMgPC3mXvxV',
  attacker: 'Hy6psfgdEAs9KVVxgG1i9WXhpzQ1BjGus4AZXzdJwwSE',
  good: 'gAIBBQnkAwmYz9WtFyPBaflWqgueuGGbWZK9YSwq9Cjrx5+N8O1jEw/uqEdB+ohRuT6t/5XrbNEduBn4ZQwSWbQRijD0rDZMCiR0BCGsdFYSxV9tPYeAXvQZnKHgdX4hwtGKXFhAiy0d7mTKd2P+icsAlmQDo/cvL6Oyy98mOgOyAdtT/oyXJY9OJInxuz0QKRSODYMLWhOZ2v8QhASOe9jb6fhZdVxMuSVsp83ErP3Gz+7ahJAX5bn5UU6ZGRvWfgsNQnY7RCyzkSFX8TqTPQE0KC0DK1/+zQGi2/G3eQYI3wAupwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKke99rE0CWIqCJVZbHg787+3cT1n3suVUk/m08wfjR08gIEBgACBQYHCAEBCAQDBgIBCgxAS0wAAAAAAAYA',
  toAttacker: 'gAIBBQnkAwmYz9WtFyPBaflWqgueuGGbWZK9YSwq9Cjrx5+N8O1jEw/uqEdB+ohRuT6t/5XrbNEduBn4ZQwSWbQRijD0oqJDToh43NVu+fgBvvrinxK4pkRJBiGSvEmsxwu90atAiy0d7mTKd2P+icsAlmQDo/cvL6Oyy98mOgOyAdtT/oyXJY9OJInxuz0QKRSODYMLWhOZ2v8QhASOe9jb6fhZ/BoaWiGjTFi0RttfapDqSNXYzcwlBgEvSlE6bGf/XY87RCyzkSFX8TqTPQE0KC0DK1/+zQGi2/G3eQYI3wAupwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKke99rE0CWIqCJVZbHg787+3cT1n3suVUk/m08wfjR08gIEBgACBQYHCAEBCAQDBgIBCgxAS0wAAAAAAAYA',
  biggerAmount: 'gAIBBQnkAwmYz9WtFyPBaflWqgueuGGbWZK9YSwq9Cjrx5+N8O1jEw/uqEdB+ohRuT6t/5XrbNEduBn4ZQwSWbQRijD0rDZMCiR0BCGsdFYSxV9tPYeAXvQZnKHgdX4hwtGKXFhAiy0d7mTKd2P+icsAlmQDo/cvL6Oyy98mOgOyAdtT/oyXJY9OJInxuz0QKRSODYMLWhOZ2v8QhASOe9jb6fhZdVxMuSVsp83ErP3Gz+7ahJAX5bn5UU6ZGRvWfgsNQnY7RCyzkSFX8TqTPQE0KC0DK1/+zQGi2/G3eQYI3wAupwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKke99rE0CWIqCJVZbHg787+3cT1n3suVUk/m08wfjR08gIEBgACBQYHCAEBCAQDBgIBCgwAZc0dAAAAAAYA',
  otherOwner: 'gAIBBQnkAwmYz9WtFyPBaflWqgueuGGbWZK9YSwq9Cjrx5+N8PwaGloho0xYtEbbX2qQ6kjV2M3MJQYBL0pROmxn/12PrDZMCiR0BCGsdFYSxV9tPYeAXvQZnKHgdX4hwtGKXFiiokNOiHjc1W75+AG++uKfErimREkGIZK8SazHC73Rq4yXJY9OJInxuz0QKRSODYMLWhOZ2v8QhASOe9jb6fhZdVxMuSVsp83ErP3Gz+7ahJAX5bn5UU6ZGRvWfgsNQnY7RCyzkSFX8TqTPQE0KC0DK1/+zQGi2/G3eQYI3wAupwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKke99rE0CWIqCJVZbHg787+3cT1n3suVUk/m08wfjR08gIEBgACBQYHCAEBCAQDBgIBCgxAS0wAAAAAAAYA',
  bareTransfer: 'gAIBAgbkAwmYz9WtFyPBaflWqgueuGGbWZK9YSwq9Cjrx5+N8O1jEw/uqEdB+ohRuT6t/5XrbNEduBn4ZQwSWbQRijD0QIstHe5kyndj/onLAJZkA6P3Ly+jssvfJjoDsgHbU/6iokNOiHjc1W75+AG++uKfErimREkGIZK8SazHC73Rqwbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpO0Qss5EhV/E6kz0BNCgtAytf/s0Botvxt3kGCN8ALqce99rE0CWIqCJVZbHg787+3cT1n3suVUk/m08wfjR08gEEBAIFAwEKDEBLTAAAAAAABgA=',
  extraInstruction: 'gAIAAwjkAwmYz9WtFyPBaflWqgueuGGbWZK9YSwq9Cjrx5+N8O1jEw/uqEdB+ohRuT6t/5XrbNEduBn4ZQwSWbQRijD0/BoaWiGjTFi0RttfapDqSNXYzcwlBgEvSlE6bGf/XY9Aiy0d7mTKd2P+icsAlmQDo/cvL6Oyy98mOgOyAdtT/qw2TAokdAQhrHRWEsVfbT2HgF70GZyh4HV+IcLRilxYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8AqTtELLORIVfxOpM9ATQoLQMrX/7NAaLb8bd5BgjfAC6nHvfaxNAliKgiVWWx4O/O/t3E9Z97LlVJP5tPMH40dPICBQIBAgwCAAAAQEIPAAAAAAAGBAMHBAEKDEBLTAAAAAAABgA=',
};
const units = 5_000_000n;
const expectRefused = (message: string, recipient: string | null = F.recipient, wallet = F.owner, amount = units) =>
  assert.throws(() => checkPreparedTransfer(message, { wallet, recipient, units: amount }), /different transfer/);

test('accepts the transfer the server builds', () => {
  checkPreparedTransfer(F.good, { wallet: F.owner, recipient: F.recipient, units });
  checkPreparedTransfer(F.good, { wallet: F.owner, recipient: null, units });
});

test('refuses a transfer to someone other than the confirmed recipient', () => expectRefused(F.toAttacker));
test('refuses a different amount', () => {
  expectRefused(F.biggerAmount);
  expectRefused(F.good, F.recipient, F.owner, 4_000_000n);
});
test('refuses a transfer from another wallet', () => expectRefused(F.otherOwner));
test('refuses a transfer whose destination is not bound to the recipient', () => expectRefused(F.bareTransfer));
test('refuses extra instructions', () => expectRefused(F.extraInstruction));
test('refuses a wrong signer and unreadable input', () => {
  expectRefused(F.good, F.recipient, F.attacker);
  expectRefused('not base64!');
  expectRefused(F.good.slice(0, 40));
});

test('release builds need HTTPS for the API address', () => {
  assert.equal(isAllowedApiUrl('https://api.example.com', false), true);
  assert.equal(isAllowedApiUrl('http://api.example.com', false), false);
  assert.equal(isAllowedApiUrl('http://192.168.1.20:5184', true), true);
  assert.equal(isAllowedApiUrl('not a url', true), false);
  assert.equal(isAllowedApiUrl('', true), false);
});
