function isAllowedOrigin(origin, expectedOrigin) {
  return !origin || origin === expectedOrigin;
}

function restrictOrigin(expectedOrigin) {
  return (req, res, next) => {
    const origin = req.get('origin');
    if (!isAllowedOrigin(origin, expectedOrigin)) {
      return res.status(403).type('text/plain').send('Origin not allowed.');
    }
    if (origin) {
      res.set('Access-Control-Allow-Origin', expectedOrigin);
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
