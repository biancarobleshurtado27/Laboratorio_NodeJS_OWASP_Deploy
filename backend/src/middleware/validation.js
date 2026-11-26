function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const labels = {
        name: 'Nombre', email: 'Correo', phone: 'Teléfono', password: 'Contraseña',
        title: 'Título', content: 'Contenido', role: 'Rol'
      };
      const details = [...new Set(result.error.issues.map((issue) => {
        const field = issue.path[0];
        if (field === 'password') return 'Contraseña: usa 12 o más caracteres, con mayúscula, minúscula, número y símbolo.';
        if (field === 'email') return 'Correo: escribe una dirección de correo válida.';
        if (field === 'name') return 'Nombre: escribe entre 2 y 80 caracteres.';
        if (field === 'phone') return 'Teléfono: no puede exceder 32 caracteres.';
        return `${labels[field] || 'Dato'}: ${issue.message}`;
      }))];
      return res.status(400).render('error', {
        title: 'Datos inválidos',
        message: 'Corrige los siguientes datos e inténtalo de nuevo.',
        details
      });
    }
    req.validated = result.data;
    next();
  };
}
module.exports = { validate };
