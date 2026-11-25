const { verifyAccessToken } = require('../security/access-token');

function requireAccessToken(req, res, next) {
  const [scheme, token] = String(req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.accessToken = verifyAccessToken(token);
    next();
  } catch (_error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { requireAccessToken };
