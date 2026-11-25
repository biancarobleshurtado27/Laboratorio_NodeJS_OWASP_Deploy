const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
const { encrypt, decrypt, hashResetToken } = require('../src/crypto');

test('AES-256-GCM decrypts and uses a distinct random IV', () => {
  const first = encrypt('el alien del sótano trabaja mal');
  const second = encrypt('el alien del sótano trabaja mal');
  assert.notEqual(first, second);
  assert.equal(decrypt(first), 'el alien del sótano trabaja mal');
});
test('AES-GCM detects ciphertext tampering', () => {
  const payload = encrypt('secreto');
  const pieces = payload.split('.');
  pieces[2] = Buffer.from('alterado').toString('base64');
  assert.throws(() => decrypt(pieces.join('.')));
});
test('reset token hashing is deterministic but does not expose the token', () => {
  assert.equal(hashResetToken('abc'), hashResetToken('abc'));
  assert.notEqual(hashResetToken('abc'), 'abc');
});
