function notFound(_req, res) {
  return res.status(404).render('error', { title: 'No encontrada', message: 'La página solicitada no existe.' });
}
function errorHandler(log) {
  return (err, req, res, _next) => {
    log.error({ err: { message: err.message, stack: err.stack }, path: req.path }, 'unhandled_error');
    if (res.headersSent) return;
    res.status(500).render('error', { title: 'Error interno', message: 'Ocurrió un error inesperado. Inténtalo más tarde.' });
  };
}
module.exports = { notFound, errorHandler };
