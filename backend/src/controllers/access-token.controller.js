const { query } = require('../servers/database');
const { createAccessToken, TOKEN_TTL_SECONDS } = require('../security/access-token');

function issueAccessToken(req, res) {
  const token = createAccessToken(req.session.user);
  return res.status(201).json({ accessToken: token, tokenType: 'Bearer', expiresIn: TOKEN_TTL_SECONDS });
}

async function getCurrentApiUser(req, res, next) {
  try {
    const result = await query('SELECT id,email,name,role FROM users WHERE id=$1', [req.accessToken.sub]);
    if (!result.rows[0]) return res.status(401).json({ error: 'Unauthorized' });
    return res.json({ user: result.rows[0] });
  } catch (error) { return next(error); }
}

module.exports = { issueAccessToken, getCurrentApiUser };
