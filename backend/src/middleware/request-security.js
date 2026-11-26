function isAllowedOrigin(origin, expectedOrigin, allowLocalhost = false) {
  if (!origin || origin === expectedOrigin) return true;
  if (!allowLocalhost) return false;
  try {
    const received = new URL(origin);
    const expected = new URL(expectedOrigin);
    const localNames = new Set(['localhost', '127.0.0.1', '[::1]']);
    return received.protocol === expected.protocol
      && received.port === expected.port
      && localNames.has(received.hostname)
      && localNames.has(expected.hostname);
  } catch (_error) { return false; }
}

function restrictOrigin(expectedOrigin, allowLocalhost = false) {
  return (req, res, next) => {
    const allowedOrigin = typeof expectedOrigin === 'function' ? expectedOrigin(req) : expectedOrigin;
    const origin = req.get('origin');
    // Browser address-bar navigation may carry a null origin. All state-changing
    // routes additionally verify a per-session CSRF token, so null does not
    // receive CORS access and cannot bypass the form-token protection.
    const safeExtensionNavigation = typeof origin === 'string' && origin.startsWith('chrome-extension://');
    if (origin === 'null') return next();
    if (['GET', 'HEAD'].includes(req.method) && safeExtensionNavigation) return next();
    if (!isAllowedOrigin(origin, allowedOrigin, allowLocalhost)) {
      return res.status(403).type('text/plain').send('Origin not allowed.');
    }
    if (origin) {
      res.set('Access-Control-Allow-Origin', allowedOrigin);
      res.set('Vary', 'Origin');
    }
    next();
  };
}

function noStoreAuthenticatedPages(req, res, next) {
  if (req.session?.user) res.set('Cache-Control', 'no-store, max-age=0');
  next();
}

module.exports = { isAllowedOrigin, restrictOrigin, noStoreAuthenticatedPages };
