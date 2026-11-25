const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DISPLAY_TIME_ZONE = 'America/Costa_Rica';
const { formatDateTime } = require('../src/utils/date-time');

test('formats audit timestamps in Costa Rica time', () => {
  const formatted = formatDateTime('2026-11-25T01:08:37.000Z');
  assert.match(formatted, /24\/11\/26/);
  assert.match(formatted, /7:08:37 p\. m\./);
});
