const jwt = require('jsonwebtoken');

const ISSUER = 'securevault';
const AUDIENCE = 'securevault-api';
const TOKEN_TTL_SECONDS = 15 * 60;

function accessTokenSecret() {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error('ACCESS_TOKEN_SECRET must be at least 32 characters');
  return secret;
}

function createAccessToken(user) {
  return jwt.sign(
    { sub: String(user.id), role: user.role },
    accessTokenSecret(),
    { algorithm: 'HS256', expiresIn: TOKEN_TTL_SECONDS, issuer: ISSUER, audience: AUDIENCE }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, accessTokenSecret(), { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE });
}

module.exports = { createAccessToken, verifyAccessToken, TOKEN_TTL_SECONDS };
