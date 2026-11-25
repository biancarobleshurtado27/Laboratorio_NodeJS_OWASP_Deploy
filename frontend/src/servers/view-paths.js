const path = require('node:path');

const frontendRoot = path.join(__dirname, '..');
const pagesPath = path.join(frontendRoot, 'pages');
const staticPath = path.join(frontendRoot, 'styles');

module.exports = { pagesPath, staticPath };
