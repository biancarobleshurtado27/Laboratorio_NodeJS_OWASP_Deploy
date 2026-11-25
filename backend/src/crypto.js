const crypto = require('node:crypto');

function encryptionKey() {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) throw new Error('DATA_ENCRYPTION_KEY is required');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('DATA_ENCRYPTION_KEY must decode to exactly 32 bytes');
  return key;
}

function encrypt(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((v) => v.toString('base64')).join('.');
}

function decrypt(payload) {
  const fields = String(payload).split('.');
  if (fields.length !== 3) throw new Error('Malformed encrypted payload');
  const [iv, tag, ciphertext] = fields.map((part) => Buffer.from(part, 'base64'));
  if (iv.length !== 12 || tag.length !== 16) throw new Error('Malformed encrypted payload');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const newResetToken = () => crypto.randomBytes(32).toString('base64url');
module.exports = { encrypt, decrypt, hashResetToken, newResetToken };
