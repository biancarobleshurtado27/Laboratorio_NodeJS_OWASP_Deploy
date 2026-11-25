function formatDate(value, locale = 'es-CR') { return new Date(value).toLocaleString(locale); }
module.exports = { formatDate };
