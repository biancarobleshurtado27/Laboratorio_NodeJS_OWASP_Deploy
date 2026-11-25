// Reserved for progressive client-side UX enhancements. Server-side validation remains authoritative.
function isFormSubmission(value) { return value && typeof value === 'object'; }
module.exports = { isFormSubmission };
