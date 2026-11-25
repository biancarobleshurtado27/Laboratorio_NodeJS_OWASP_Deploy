const test = require('node:test');
const assert = require('node:assert/strict');
process.env.ACCESS_TOKEN_SECRET = 'development-access-token-secret-with-more-than-32-characters';
const { createAccessToken, verifyAccessToken } = require('../src/security/access-token');

test('issues and verifies a short-lived HS256 access token', () => {
  const token = createAccessToken({ id: 7, role: 'admin' });
  const payload = verifyAccessToken(token);
  assert.equal(payload.sub, '7');
  assert.equal(payload.role, 'admin');
  assert.equal(payload.iss, 'securevault');
});

test('rejects a token signed with another algorithm', () => {
  const jwt = require('jsonwebtoken');
  const forged = jwt.sign({ sub: '7' }, process.env.ACCESS_TOKEN_SECRET, { algorithm: 'HS384', issuer: 'securevault', audience: 'securevault-api' });
  assert.throws(() => verifyAccessToken(forged));
});
