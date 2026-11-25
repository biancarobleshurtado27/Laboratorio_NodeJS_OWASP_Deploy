# SecureVault

Aplicación web de notas privadas para el laboratorio de seguridad Node.js. Incluye historias ficticias como contenido de las notas, por ejemplo: *"el alien del sótano está incumpliendo su turno"* o *"la persona de limpieza es la CEO encubierta"*. Son datos de demostración: no describen personas ni empresas reales.

## Características

- Registro, inicio/cierre de sesión, dos roles y panel administrativo.
- Notas con aislamiento por propietario y contenido cifrado mediante AES-256-GCM.
- Teléfono cifrado y mostrado únicamente en forma enmascarada.
- Recuperación con token aleatorio de un único uso; la BD guarda solo SHA-256 del token.
- Bitácora JSON de eventos de seguridad, rate limiting y bloqueo progresivo.

## Estructura del proyecto

```
backend/       # Servidor Express, base de datos, criptografía y pruebas
  src/
    migrations/ # Inicialización y futuros cambios de esquema
    routes/     # Definición de endpoints
    controllers/# Lógica de respuesta HTTP
    middleware/ # Validación y manejo centralizado de errores
    security/   # Cifrado y utilidades de seguridad
    servers/    # Servidor Express y conexión PostgreSQL
    validators/ # Esquemas Zod para entradas
  test/
frontend/
  src/
    routes/     # Catálogo de rutas públicas, protegidas y administrativas
    components/ # Componentes compartidos EJS, como header y footer
    servers/    # Configuración de paths para el servidor de vistas y archivos estáticos
    context/    # Contexto compartido que reciben las vistas
    hooks/      # Base para mejoras progresivas del formulario en cliente
    pages/      # Pantallas EJS
    styles/     # CSS de la interfaz
    utils/      # Formateadores reutilizables
docs/          # Informes, investigación y guion de demostración
```

## Ejecución local

1. Copia `.env.example` a `.env` y completa los valores.
2. Genera secretos locales (no los publiques):

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

3. Crea una base PostgreSQL y usa su URL en `DATABASE_URL`.
4. Ejecuta `npm ci`, `npm run db:init` y `npm start`.
5. Abre `http://localhost:3000`.

### Alternativa recomendada con Docker

Con Docker Desktop encendido, ejecuta `docker compose up --build`. Esto inicia PostgreSQL y SecureVault; luego abre `http://localhost:3000`. El archivo `.env` creado para desarrollo local está excluido de Git y debe reemplazarse por secretos fuertes en cualquier despliegue real.

Para revisar rápidamente la interfaz local, Docker crea solo en desarrollo la cuenta `admin@umbrafiction.example` con contraseña `VaultDemo!2026`. Esta cuenta no debe existir ni usarse en producción.

Variables requeridas: `DATABASE_URL`, `DATA_ENCRYPTION_KEY`, `SESSION_SECRET`, `NODE_ENV`, `PORT`, `APP_ORIGIN` y, en producción, `DATABASE_SSL=true`.

Para convertir un usuario de prueba a administrador, usa el SQL, solo en tu BD de laboratorio:

```sql
UPDATE users SET role = 'admin' WHERE email = 'correo-del-admin@ejemplo.com';
```

## Despliegue en Render + Neon

1. Sube el repositorio, sin `.env`, a GitHub.
2. Crea una base en Neon y copia su cadena de conexión con TLS.
3. En Render crea un **Web Service** desde el repositorio o usa `render.yaml`.
4. Configura en el panel de secretos `DATABASE_URL`, `DATA_ENCRYPTION_KEY` (base64 de 32 bytes), `SESSION_SECRET` (48+ caracteres), `APP_ORIGIN`, `NODE_ENV=production` y `DATABASE_SSL=true`.
5. Render ejecuta `npm ci`, el audit de producción, `npm run db:init` y arranca el proceso. Comprueba `/health` y que el navegador marque HTTPS.

No publiques credenciales de prueba en este README; entrégalas al docente por un canal privado. Las instancias gratis de Render se suspenden tras inactividad y sus discos son efímeros, por eso PostgreSQL externo es obligatorio.

## Verificación de seguridad

```powershell
npm test
npm run audit:prod
```

Pruebas manuales requeridas: intentar abrir `/notes/<id-ajeno>/edit`, enviar cinco credenciales erróneas, probar `<script>alert(1)</script>` como título y observar el contenido cifrado en la tabla `notes`. El workflow de GitHub Actions ejecuta instalación reproducible, pruebas y auditoría en cada push/PR.

Consulte [docs/SECURITY-REPORT.md](docs/SECURITY-REPORT.md) y [docs/DEEP-RESEARCH.md](docs/DEEP-RESEARCH.md) para las evidencias y la investigación.
