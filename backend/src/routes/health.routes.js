const { health } = require('../controllers/health.controller');
function registerHealthRoutes(app) { app.get('/health', health); }
module.exports = { registerHealthRoutes };
