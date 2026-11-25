# Informe de seguridad - SecureVault

## Modelo de amenazas resumido

Flujo: navegador HTTPS -> proxy TLS de Render -> Express -> PostgreSQL TLS. Los secretos viven en el gestor de variables de la plataforma. Un atacante puede intentar robar sesiones, adivinar contraseñas, manipular IDs de notas, inyectar texto o leer una copia de la base.

| Amenaza (STRIDE) | Mitigación implementada |
|---|---|
| Suplantación y fuerza bruta | bcrypt cost 12, sesión regenerada, límite de 5 logins/15 min y bloqueo temporal por usuario. |
| Manipulación de notas | AES-256-GCM usa IV aleatorio y tag de 16 bytes; detecta modificaciones. |
| Repudio | `audit_logs` registra logins, fallos, denegaciones, roles y recuperación sin secretos. |
| Revelación de datos | HTTPS, cookies HttpOnly/Secure/SameSite, cifrado de notas/teléfono y máscara de perfil. |
| IDOR/elevación | Cada consulta de nota incluye `owner_id=$usuarioActual`; middleware de administrador deniega por defecto. |
| Abuso/DoS | límite de tamaño de body, límites de título/contenido, rate limit y timeouts de base de datos. |

Límites de negocio: título máximo 120 caracteres, nota máxima 5,000 caracteres, body máximo 12 KB. No hay solicitudes salientes a URLs, por lo que no se incorpora una superficie SSRF.

## Matriz OWASP Top 10:2025

| Categoría | Mitigación | Evidencia a capturar durante la demo |
|---|---|---|
| A01 Broken Access Control | `ownedNote` filtra por `id` y `owner_id`; `requireAdmin` valida rol servidor. | Usuario A abre ID de B: 404 y evento `access_denied`. |
| A02 Security Misconfiguration | Helmet/CSP/HSTS en producción, `x-powered-by` desactivado, origen restringido, no-cache autenticado, errores genéricos y secretos externos. | Cabeceras en producción y resultado SecurityHeaders. |
| A03 Supply Chain | `package-lock.json`, `npm ci`, `npm audit --omit=dev`; CI. | Salida de audit y workflow. |
| A04 Cryptographic Failures | bcrypt 12, AES-256-GCM con IV único, TLS y cookies Secure. | Hash `$2b$` y ciphertext `iv.tag.datos` en BD. |
| A05 Injection | Zod en todas las entradas, parámetros `$1`, EJS escapa salida y CSP. | `OR 1=1`/script no alteran consultas ni ejecutan JS. |
| A06 Insecure Design | STRIDE, límites y abusos documentados arriba. | Este informe y diagrama de flujo. |
| A07 Authentication Failures | Rate limit 429, bloqueo progresivo, sesión 30 min y regeneración. | Seis intentos producen 429. |
| A08 Integrity Failures | Lockfile, CI previo al deploy, dependencias mínimas; no deserialización insegura. | Ejecución verde de GitHub Actions. |
| A09 Logging/Alerting | Pino estructurado, redacción de password/token y bitácora admin. | Logs JSON sin secretos y panel admin. |
| A10 Exceptional Conditions | Manejador global, `unhandledRejection`, timeouts PG y respuesta genérica. | Error forzado: 500 sin stack trace; detalle solo en log. |

## Decisiones criptográficas y rotación

Las contraseñas no se descifran: se comparan con bcrypt de costo 12. Notas y teléfono deben recuperarse, por ello se cifran con AES-256-GCM, IV de 12 bytes nuevo por registro y tag de autenticación. El token de recuperación tiene 32 bytes aleatorios y se almacena como SHA-256 porque ya posee alta entropía.

Si se pierde `DATA_ENCRYPTION_KEY`, las notas y teléfonos existentes no pueden recuperarse: es un riesgo residual deliberado del cifrado fuerte. Para rotar la llave sin pérdida, la siguiente versión debe añadir `key_version` a las columnas cifradas, conservar temporalmente la llave anterior en el gestor de secretos, descifrar/re-cifrar cada registro en una migración controlada y retirar la llave vieja después de verificar copias de seguridad.

## Riesgos residuales y evidencia pendiente de producción

Antes de entregar, adjuntar capturas reales de `npm audit`, OWASP ZAP baseline contra la URL propia, SecurityHeaders y SSL Labs. El plan gratuito puede dormir el servicio; para uso real se requiere instancia siempre activa, backup, monitoreo y proveedor de correo para el enlace de recuperación. No se deben ejecutar escaneos contra sistemas ajenos.
