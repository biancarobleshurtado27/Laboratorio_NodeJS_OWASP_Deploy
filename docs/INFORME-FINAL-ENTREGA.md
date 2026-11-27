# INFORME FINAL DE LABORATORIO: SISTEMA SEGURO EN NODE.JS
## SecureVault: Implementación OWASP Top 10:2025, Criptografía y Despliegue en Producción

---

**Asignatura:** Programación Back-End / Seguridad Web  
**Proyecto:** SecureVault (UmbraFiction Vault)  
**Estudiante / Equipo:** Bianca Robles  
**Fecha:** Noviembre 2026  
**URL de Producción (HTTPS):** [https://securevault-production-583c1b9d.up.railway.app](https://securevault-production-583c1b9d.up.railway.app)  
**Repositorio GitHub:** [https://github.com/biancarobleshurtado27/Laboratorio_NodeJS_OWASP_Deploy](https://github.com/biancarobleshurtado27/Laboratorio_NodeJS_OWASP_Deploy)  

---

## 1. Resumen Ejecutivo y Propósito

El propósito de este laboratorio práctico fue diseñar, construir, securizar y desplegar en un entorno real de producción una aplicación web completa en **Node.js** denominada **SecureVault**. 

En la industria del software, un sistema no se considera finalizado cuando «funciona en local», sino cuando está desplegado en la nube pública bajo **HTTPS**, resiste ataques reales y aplica controles de seguridad rigurosos en cada capa. SecureVault es una bóveda de notas privadas ambientada en la temática ficticia de *UmbraFiction*, donde cada usuario autenticado puede almacenar secretos corporativos de forma estrictamente confidencial.

El desarrollo abarcó:
1. **Fase 0 - Deep Research**: Investigación comparativa de alternativas de despliegue en producción (PaaS, Docker, VPS), gestión de secretos y proxies inversos.
2. **Fase 1 y 2 - Arquitectura y Desarrollo Seguro**: Implementación de los 8 requisitos funcionales (RF-01 a RF-08) y mitigación demostrable de las 10 categorías de **OWASP Top 10:2025**.
3. **Fase 3 - Despliegue en Producción**: Puesta en marcha en **Railway** utilizando contenedores Docker, base de datos gestionada **PostgreSQL**, certificados TLS automáticos y gestión de secretos fuera del código fuente.
4. **Fase 4 - Verificación y Pruebas**: Suite de pruebas automatizadas con `node:test`, auditoría de dependencias (`npm audit`) sin vulnerabilidades altas/críticas y validación manual de ataques bloqueados.
5. **Experiencia de Usuario Profesional (Obsidian Cipher)**: Integración de un sistema de diseño UI moderno y sofisticado en modo oscuro, con tipografía técnica (*Plus Jakarta Sans*, *JetBrains Mono*), iconografía outline y microinteracciones fluidas.

---

## 2. Requisitos Funcionales Implementados (RF-01 a RF-08)

| ID | Requisito | Implementación Técnica en SecureVault |
|---|---|---|
| **RF-01** | **Registro de usuario** | Validación estricta con esquemas Zod (nombre 2-80 caracteres, correo RFC 5322, contraseña $\ge$ 12 caracteres con mayúscula, minúscula, número y símbolo). La contraseña se almacena **exclusivamente como hash irreversible** mediante **Bcrypt (cost 12)**. |
| **RF-02** | **Inicio y cierre de sesión** | Sesión segura gestionada en base de datos PostgreSQL (`connect-pg-simple`), cookies firmadas con atributos `HttpOnly`, `Secure` y `SameSite=Lax`. Cierre de sesión que destruye la sesión y limpia la cookie en el cliente. |
| **RF-03** | **Roles y Autorización** | Roles diferenciados: `user` y `admin`. El rol no es confiado al cliente: se valida y verifica en cada solicitud desde la sesión en el servidor (`requireRole('admin')`). |
| **RF-04** | **CRUD de notas privadas** | Cada usuario crea, lee, edita y elimina **únicamente sus propias notas**. El contenido de la nota se almacena cifrado en la base de datos con **AES-256-GCM**. |
| **RF-05** | **Dato sensible de perfil** | Teléfono del usuario almacenado cifrado con **AES-256-GCM** en reposo. En la interfaz de usuario se muestra siempre enmascarado (`***-***-1234`). |
| **RF-06** | **Recuperación de contraseña** | Generación de token criptográfico de alta entropía (`crypto.randomBytes(32)`). En la base de datos se guarda únicamente el hash **SHA-256** del token con expiración de 1 hora y uso único. |
| **RF-07** | **Panel de administración** | Interfaz exclusiva para administradores con listado de usuarios y **bitácora de auditoría de seguridad** (`audit_logs`) que audita logins exitosos, logins fallidos, intentos de acceso denegado y cambios de clave. |
| **RF-08** | **Endpoint de salud** | `GET /health` responde `{ "status": "ok" }` sin exponer versiones de paquetes, software de servidor ni datos internos de la infraestructura. |

---

## 3. Matriz de Seguridad: OWASP Top 10:2025

| Categoría OWASP | Mitigación Implementada | Evidencia Verificable |
|---|---|---|
| **A01: Broken Access Control (incluye SSRF)** | Cada consulta SQL a notas incluye la cláusula estricta `WHERE id = $1 AND owner_id = $2`. Si un usuario intenta acceder al ID de nota de otro, el sistema deniega el acceso por defecto. Sin peticiones HTTP salientes (superficie SSRF eliminada). | Si el usuario B intenta abrir la nota del usuario A (`/notes/:id/edit`), el sistema devuelve **404 / 403** y registra el evento `access_denied` en la bitácora. |
| **A02: Security Misconfiguration** | Cabeceras de seguridad HTTP configuradas con `helmet` (CSP con dominios seguros, HSTS, X-Content-Type-Options, Frameguard). Desactivación de `X-Powered-By`. Configuración `app.set('trust proxy', 1)`. `NODE_ENV=production`. Sin stack traces expuestos al cliente. | Encabezados validados en Railway; calificación **A** en SecurityHeaders; ausencia de cabeceras reveladoras de Express. |
| **A03: Software Supply Chain Failures** | Fijación estricta de dependencias mediante `package-lock.json`. Instalación reproducible con `npm ci`. Reducción al mínimo de librerías externas. | Ejecución de `npm run audit:prod` con **0 vulnerabilidades altas o críticas**. |
| **A04: Cryptographic Failures** | Contraseñas con **Bcrypt** ($cost = 12$). Notas y teléfono con cifrado autenticado **AES-256-GCM** (IV aleatorio de 12 bytes por registro + Authentication Tag de 16 bytes). Tokens con SHA-256. Llaves fuera de Git. Tráfico bajo **TLS 1.2/1.3**. Cookies con bandera `Secure`. | En la base de datos PostgreSQL, las contraseñas inician con `$2b$12$` y las notas se almacenan como `iv.tag.ciphertext` en Base64. |
| **A05: Injection (incluye XSS)** | Consultas 100% parametrizadas en PostgreSQL (`$1, $2, ...`). Validación de esquema previa con Zod. Escape automático contextual de salida HTML mediante EJS. Política CSP que prohíbe scripts inline maliciosos. | La inyección SQL `' OR 1=1 --` es rechazada por el validador de correo y neutralizada por el driver `pg`. Inyecciones XSS como `<script>alert(1)</script>` se renderizan como texto inofensivo. |
| **A06: Insecure Design** | Modelo de amenazas STRIDE aplicado desde el diseño. Límites de negocio estrictos: título máximo 120 caracteres, nota máxima 5.000 caracteres, cuerpo HTTP limitado a 12 KB. | Esquemas de validación Zod y límites de tamaño de payload en `express.json()` y `express.urlencoded()`. |
| **A07: Authentication Failures** | Rate limiting progresivo en endpoint de autenticación (`express-rate-limit`: 5 intentos por ventana de 15 minutos). Regeneración obligatoria de Session ID tras login (`req.session.regenerate`). Expiración de sesión (30 min) y mensajes de error genéricos que no indican si falló el correo o la clave. | 6 intentos fallidos devuelven código **HTTP 429 Too Many Requests** y generan alerta de seguridad. |
| **A08: Software or Data Integrity Failures** | Cero deserialización de objetos no confiables. Tokens JWT con firma de algoritmo fijo (HS256). Pipeline automatizado de Integración Continua (CI) en GitHub Actions que ejecuta suite de pruebas y auditoría antes de despliegue. | Workflow de CI en `.github/workflows/ci.yml` ejecutando `npm ci`, `npm test` y `npm audit` exitosamente. |
| **A09: Security Logging & Alerting Failures** | Bitácora estructurada JSON con `pino`. Registro de eventos críticos en base de datos (`audit_logs`) con IP, usuario, timestamp y tipo de evento. **Redacción absoluta de secretos**: contraseñas, tokens y llaves nunca se imprimen en logs. Alerta ante fallos repetidos. | Panel de bitácora visible para administradores y registros de consola limpios de credenciales. |
| **A10: Mishandling of Exceptional Conditions** | Middleware global de manejo de errores. Respuestas genéricas al usuario (`"Ha ocurrido un error inesperado"`). Filosofía fail-closed. Captura de `unhandledRejection` y `uncaughtException`. Timeouts de conexión configurados en la base de datos PostgreSQL. | Petición que fuerce un error devuelve HTTP 500 genérico sin filtrar rutas del servidor ni líneas de código. |

---

## 4. Criptografía Aplicada: Hash vs. Cifrado

Uno de los pilares del laboratorio fue aplicar la distinción fundamental entre **hash** y **cifrado**:

```
                              ┌── Hash (Irreversible)  ──> Bcrypt / SHA-256
                              │   (No se descifra; solo se compara)
¿Necesito recuperar el dato? ─┤
                              │
                              └── Cifrado (Reversible) ──> AES-256-GCM
                                  (Se descifra solo para el dueño legítimo)
```

### Tabla de Decisiones Criptográficas

| Dato | Técnica | Algoritmo y Parámetros | Justificación |
|---|---|---|---|
| **Contraseña de usuario** | Hash lento con sal | **Bcrypt** (costo 12, salt aleatorio generado internamente) | Es irreversible. El factor de trabajo computacional (cost 12) mitiga ataques de fuerza bruta offline por GPU/ASIC. |
| **Contenido de notas** | Cifrado simétrico autenticado | **AES-256-GCM** (Llave 256 bits, IV único de 12 bytes por registro, Tag de 16 bytes) | El usuario necesita volver a leer sus notas. GCM proporciona confidencialidad e integridad (detecta cualquier alteración en la base de datos). |
| **Teléfono del perfil** | Cifrado simétrico autenticado | **AES-256-GCM** | Dato sensible que debe ser desencriptado únicamente al ser consultado por el dueño, mostrándolo enmascarado. |
| **Token de recuperación** | Hash rápido | **SHA-256** sobre token de 32 bytes de alta entropía (`crypto.randomBytes(32)`) | Al tener alta entropía generada por el sistema operativo, no requiere un hash costoso. Si la base de datos es filtrada, los tokens son inútiles para el atacante. |
| **Tráfico en tránsito** | Seguridad de transporte | **TLS 1.2 / TLS 1.3** (Certificado gestionado por Railway) | Cifra todas las comunicaciones HTTP, protegiendo credenciales y cookies de sesión contra intercepción en red. |

### Respuestas a las Preguntas de Análisis Obligatorias (Páginas 5 y 7 del PDF)

#### 1. ¿Qué ocurre con los datos si se pierde la llave de cifrado (`DATA_ENCRYPTION_KEY`)?
> Si se pierde la llave criptográfica `DATA_ENCRYPTION_KEY`, todo el contenido de las notas y números telefónicos cifrados con AES-256-GCM se vuelve **matemáticamente irrecuperable**. Al no existir puertas traseras ni métodos de recuperación por diseño criptográfico, la información queda inaccesible para siempre. Este riesgo residual deliberado del cifrado fuerte exige que las llaves se custodien en el gestor de secretos de la infraestructura (Railway) y se respalden de forma segura fuera de línea.

#### 2. ¿Cómo rotarían la llave sin perder la información existente?
> La rotación se implementa mediante un esquema de **versionado de llaves (Key Versioning)**:
> 1. Se añade la columna `key_version INT DEFAULT 1` a las tablas `notes` y `users`.
> 2. En producción se inyecta la nueva llave activa (`DATA_ENCRYPTION_KEY_V2`) y se preserva la anterior (`DATA_ENCRYPTION_KEY_V1`) temporalmente en modo lectura.
> 3. Se ejecuta un script de migración por lotes que lee cada registro, lo descifra con la llave correspondiente a su `key_version` (V1), genera un nuevo vector de inicialización (IV de 12 bytes) y lo re-cifra con la nueva llave (V2), actualizando `key_version = 2`.
> 4. Al finalizar la migración y verificar la integridad de la base, la llave V1 es dada de baja del gestor de secretos.

#### 3. ¿Qué es un proxy inverso y qué implica `trust proxy: 1` en Express?
> Un proxy inverso (como el balanceador de Railway o Nginx) se sitúa delante de Node.js para recibir el tráfico exterior por HTTPS, terminar la capa TLS y reenviar la petición internamente a Node.js sobre HTTP privado.  
> La directiva `app.set('trust proxy', 1)` indica a Express que confíe en los encabezados `X-Forwarded-Proto` y `X-Forwarded-For` añadidos por el balanceador. Esto es indispensable para que:
> - `req.secure` sea evaluado como `true`, permitiendo que el navegador acepte y almacene las cookies marcadas con la bandera `Secure`.
> - El middleware `express-rate-limit` identifique la IP real de cada cliente y no la IP compartida del balanceador de Railway.

---

## 5. Arquitectura y Despliegue en Producción (Railway)

### Diagrama de Arquitectura en la Nube

```
 Cliente (Navegador)
       │
       │ HTTPS / TLS 1.2+ (Puerto 443)
       ▼
 ┌──────────────────────────────────────────────┐
 │     Railway Edge Proxy (Terminación TLS)     │
 │  - Certificados SSL/TLS automáticos          │
 │  - HSTS / Redirección forzada HTTP -> HTTPS  │
 └──────────────────────┬───────────────────────┘
                        │
                        │ HTTP privado interno + Headers (X-Forwarded-*)
                        ▼
 ┌──────────────────────────────────────────────┐
 │          Contenedor Docker (Node.js)         │
 │  - Framework Express + Helmet + CORS         │
 │  - UI Obsidian Cipher (Tailwind + Inter)     │
 │  - Rate Limiter + Zod + Criptografía nativa  │
 └──────────────────────┬───────────────────────┘
                        │
                        │ Conexión Segura TLS (DATABASE_SSL=true)
                        ▼
 ┌──────────────────────────────────────────────┐
 │      PostgreSQL Gestionado (Railway)         │
 │  - Base de datos relacional privada          │
 │  - Sesiones (`connect-pg-simple`)            │
 │  - Notas cifradas (`iv.tag.ciphertext`)      │
 │  - Usuarios con contraseñas Bcrypt ($2b$)    │
 │  - Bitácora de auditoría (`audit_logs`)      │
 └──────────────────────────────────────────────┘
```

### Configuración del Entorno de Producción
* **Servicio Web:** Contenedor Docker basado en `node:22-alpine` no-root.
* **Comando de inicio:** `node backend/src/servers/server.js` (especificado en `railway.json`).
* **Healthcheck:** Verificación activa en `GET /health` cada ciclo de despliegue.
* **Secretos en Railway:**
  - `NODE_ENV=production`
  - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
  - `DATABASE_SSL=true`
  - `SESSION_SECRET` (Generado criptográficamente con 64 bytes)
  - `ACCESS_TOKEN_SECRET` (Llave para emisión de JWT)
  - `DATA_ENCRYPTION_KEY` (Llave de 256 bits codificada en Base64)
  - `APP_ORIGIN=https://securevault-production-583c1b9d.up.railway.app`

---

## 6. Demostración de Seguridad: Tres Ataques Bloqueados

Para la evaluación práctica o video demostrativo, se estructuró la ejecución de tres ataques comunes:

### Ataque 1: Broken Access Control / IDOR (OWASP A01)
* **Escenario de ataque:** El atacante (usuario Rubén) inicia sesión legítimamente, inspecciona la URL de una nota ajena perteneciente a Luna (ej. `/notes/1/edit` o su UUID correspondiente) e intenta acceder o modificarla forzando el parámetro.
* **Comportamiento del sistema:** La consulta SQL en backend ejecuta `SELECT * FROM notes WHERE id = $1 AND owner_id = $2`. Al no coincidir el `owner_id` con el usuario en sesión, el sistema responde **404 Not Found** (fail-closed, sin revelar si la nota existe o no) y registra en `audit_logs` el evento `access_denied`.

### Ataque 2: Inyección SQL y Cross-Site Scripting (OWASP A05)
* **Escenario de ataque (SQLi):** En el formulario de inicio de sesión se introduce `' OR 1=1 --` en el campo de correo para evadir la autenticación.
* **Comportamiento del sistema:** Zod valida que la entrada no cumple con la estructura de correo electrónico y bloquea la petición antes de ejecutar consultas. Si un payload lograra llegar al driver de base de datos, la consulta utiliza marcadores `$1`, tratando la cadena como texto literal sin alterar la semántica SQL.
* **Escenario de ataque (XSS):** Se crea una nota cuyo título es `<script>alert('Ataque XSS')</script>`.
* **Comportamiento del sistema:** EJS codifica las entidades HTML (`&lt;script&gt;`) y la cabecera CSP configurada por Helmet bloquea la ejecución de scripts no autorizados.

### Ataque 3: Ataque de Fuerza Bruta en Autenticación (OWASP A07)
* **Escenario de ataque:** Un atacante automatiza intentos repetitivos de adivinación de contraseñas sobre una cuenta corporativa.
* **Comportamiento del sistema:** El middleware `express-rate-limit` contabiliza los fallos. Al llegar al sexto intento fallido en menos de 15 minutos, el servidor bloquea de inmediato la IP con un código **HTTP 429 Too Many Requests**, emitiendo un evento `login_failure_alert` en la bitácora de seguridad.

---

## 7. Verificación Final y Resultados de Pruebas

1. **Pruebas Automatizadas:** 14 pruebas unitarias y de integración desarrolladas con el ejecutor nativo `node:test` cubriendo hashing, cifrado GCM, validaciones Zod y flujos de autenticación.
2. **Auditoría de Dependencias:** `npm audit --omit=dev --audit-level=high` reporta **cero vulnerabilidades**.
3. **Control de Código Fuente:** Repositorio Git limpio con `.gitignore` que previene cualquier subida de `.env` o archivos de configuración local.
4. **Disponibilidad:** El endpoint `/health` de Railway responde con código 200 de forma continua.
5. **Calidad de Interfaz:** Cumplimiento total de la guía de estilo *Obsidian Cipher* (diseño limpio, responsivo y adaptativo para auditorías técnicas).

---

## 8. Canales y Enlaces de Entrega

* **Página Web en Producción:** [https://securevault-production-583c1b9d.up.railway.app](https://securevault-production-583c1b9d.up.railway.app)
* **Repositorio de Código:** [https://github.com/biancarobleshurtado27/Laboratorio_NodeJS_OWASP_Deploy](https://github.com/biancarobleshurtado27/Laboratorio_NodeJS_OWASP_Deploy)
* **Documentación Complementaria en Repositorio:**
  - `docs/INFORME-FINAL-ENTREGA.md` (Documento maestro para entrega)
  - `docs/GUIA-ENTREGA-CAPTURAS.md` (Guía de capturas de pantalla y respuestas específicas)
  - `docs/DEEP-RESEARCH.md` (Investigación comparativa de plataformas y conceptos teóricos)
  - `docs/SECURITY-REPORT.md` (Detalle de mitigaciones OWASP y decisiones criptográficas)
  - `docs/DEMO-SCRIPT.md` (Guion para la demostración de 10 minutos)
