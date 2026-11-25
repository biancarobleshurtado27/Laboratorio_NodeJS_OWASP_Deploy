# Investigación: despliegue seguro de SecureVault

## Resumen ejecutivo

Para este laboratorio se propone Render como PaaS y Neon como PostgreSQL gestionado. Un PaaS reduce la carga operativa: despliegue desde Git, TLS gestionado, reinicio y logs. Docker entrega una imagen reproducible y portable, pero aún exige decidir dónde se ejecuta y operar secretos/red. Un VPS/IaaS ofrece máximo control (Nginx, firewall, sistema operativo), a costa de parches, copias de seguridad, certificados y disponibilidad administrados por el equipo. Para una demo académica, el PaaS reduce el riesgo de configuración; para producción real, una instancia de pago y base con backups son necesarias.

## Comparación vigente (consultada 25-nov-2026)

| Plataforma | Gratis/educativo y límites | BD / HTTPS / región | Decisión |
|---|---|---|---|
| Render | Web service gratis, 750 horas/mes; duerme tras 15 min; Postgres gratis expira a 30 días. | Postgres y TLS gestionado; regiones según plan. | Elegida para la demostración; usar Neon para persistencia. |
| Railway | $1 de uso mensual; el trial aporta $5 una vez/30 días; el servicio gratuito duerme tras 5-10 min. | Postgres/MySQL/Redis/Mongo de un clic y dominio `up.railway.app`; región personalizada es de pago. | Alternativa simple, pero presupuesto y suspensión la hacen menos predecible. |
| Fly.io | Máquinas/containers con control fino y TLS automático; revisar la calculadora y créditos actuales antes de crear cuenta. | PostgreSQL se opera como servicio/cluster y permite elegir regiones cercanas. | Conveniente si se necesita Docker y más control operativo. |

La información de planes cambia con frecuencia: se debe verificar en el panel del proveedor al crear el servicio. Render documenta explícitamente que sus servicios gratis tienen disco efímero y se suspenden tras 15 minutos, así que SQLite local sería una mala elección.

## Secretos, TLS y proxy

Un `.env` sirve solamente para desarrollo y puede terminar en commits, respaldos o imágenes. En producción los valores van en el gestor de secretos de la plataforma: el proceso recibe solo `DATABASE_URL`, `SESSION_SECRET` y `DATA_ENCRYPTION_KEY`; nunca se imprimen ni se versionan. Un certificado TLS autentica el sitio y negocia cifrado para HTTP. Let's Encrypt automatiza la emisión/renovación de certificados. HSTS indica al navegador que futuras visitas deben usar HTTPS.

Un proxy inverso termina TLS, enruta y protege el proceso Node. En un PaaS ese proxy lo entrega la plataforma; por ello Express debe configurar `trust proxy` para reconocer correctamente HTTPS al enviar la cookie `Secure`, sin confiar ciegamente en cabeceras desde Internet.

## Operación, CI/CD y base de datos

PM2 o systemd reinician procesos en un VPS. En un contenedor se usa un orquestador y en PaaS el proveedor reinicia el servicio, por lo que PM2 no es necesario. El pipeline mínimo es: checkout -> `npm ci` con lockfile -> `npm test` -> `npm audit --omit=dev --audit-level=high` -> despliegue solo si todo es exitoso. GitHub Actions ya contiene las primeras tres fases.

Neon ofrece PostgreSQL gestionado; la aplicación usa una URL TLS y un usuario limitado a su base. Se debe restringir quién recibe la cadena de conexión, rotarla al exponerse, mantener TLS habilitado y no abrir una base a Internet sin autenticación. En desarrollo se habilitan mensajes y HTTP local; en producción se establece `NODE_ENV=production`, CORS/origen restringido si se agrega una API pública, logs JSON, errores genéricos, cookies Secure y HTTPS.

## Plan de despliegue y verificación posterior

```
Usuario --HTTPS--> Render proxy --HTTP privado--> Express SecureVault --TLS--> Neon PostgreSQL
                         |                         |
                    certificados                 secretos/bitácora
```

1. Crear la BD Neon y registrar secretos en Render.
2. Desplegar desde la rama principal y comprobar `GET /health`.
3. Crear cuentas de prueba, designar un administrador y entregar sus credenciales solo por canal privado.
4. Confirmar HTTPS/redirección, cabeceras, cookies, TLS y que la BD contiene texto cifrado.
5. Ejecutar ZAP baseline únicamente sobre la URL propia, `npm audit`, SecurityHeaders, SSL Labs e intentos controlados de IDOR, inyección y fuerza bruta.

## Fuentes primarias

1. Render, [Deploy for Free](https://render.com/docs/free).
2. Render, [Your First Deploy](https://render.com/docs/your-first-deploy).
3. Railway, [Free Plan](https://docs.railway.com/pricing/free-plan).
4. OWASP, [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
5. OWASP, [Transport Layer Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html).
6. Node.js, [Crypto API](https://nodejs.org/api/crypto.html).
7. Express, [Production security best practices](https://expressjs.com/en/advanced/best-practice-security.html).
8. GitHub, [Dependency review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review).
9. Neon, [Connection strings](https://neon.com/docs/connect/connect-from-any-app).
