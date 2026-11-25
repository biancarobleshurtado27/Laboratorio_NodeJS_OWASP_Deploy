function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return res.status(400).render('error', { title: 'Datos inválidos', message: 'Revisa los datos ingresados e inténtalo de nuevo.' });
    req.validated = result.data;
    next();
  };
}
module.exports = { validate };
