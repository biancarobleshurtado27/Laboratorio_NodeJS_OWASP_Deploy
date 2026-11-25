const { issueAccessToken, getCurrentApiUser } = require('../controllers/access-token.controller');
const { requireAccessToken } = require('../middleware/access-token');

function registerAccessTokenRoutes(app, { requireAuth, csrfGuard }) {
  app.post('/api/access-token', requireAuth, csrfGuard, issueAccessToken);
  app.get('/api/me', requireAccessToken, getCurrentApiUser);
}

module.exports = { registerAccessTokenRoutes };
