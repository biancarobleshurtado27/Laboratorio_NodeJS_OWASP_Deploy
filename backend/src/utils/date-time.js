const DISPLAY_TIME_ZONE = process.env.DISPLAY_TIME_ZONE || 'America/Costa_Rica';

function formatDateTime(value) {
  return new Intl.DateTimeFormat('es-CR', {
    timeZone: DISPLAY_TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date(value));
}

module.exports = { formatDateTime, DISPLAY_TIME_ZONE };
