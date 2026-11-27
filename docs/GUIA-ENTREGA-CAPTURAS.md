# Guía Maestra de Entrega y Capturas: SecureVault (OWASP Top 10:2025)

Esta guía contiene la lista exacta de capturas que debes tomar, los datos para las pruebas manuales y las respuestas a las preguntas de análisis requeridas por la rúbrica del laboratorio.

---

## 1. Datos Ficticios para la Demostración (UmbraFiction)

Usa estos datos exactos para las pruebas en vivo o para tomar las capturas:

* **Usuario 1 (Usuario estándar)**:
  - **Correo**: `luna@umbrafiction.example`
  - **Nombre**: `Luna Mena`
  - **Teléfono**: `8888-1234`
  - **Contraseña**: `ClaveSegura2026!`
* **Notas de Luna**:
  - *Nota 1*: Título: `Incidente subnivel 9`  
    Contenido: `El alien que vive debajo del edificio está trabajando mal: dejó tres portales abiertos y perdió la llave del hangar lunar.`
  - *Nota 2*: Título: `Identidad de la CEO`  
    Contenido: `La CEO de Umbra S.A. es realmente la persona de limpieza; trabaja encubierta para evaluar quién trata bien al personal.`
* **Usuario 2 (Atacante / Segundo usuario)**:
  - **Correo**: `ruben@umbrafiction.example`
  - **Nombre**: `Rubén Castro`
  - **Teléfono**: `8765-4321`
  - **Contraseña**: `ClaveSegura2026!`
* **Cuenta Administrador (para evaluar bitácora y roles)**:
  - Para otorgarle rol de administrador a un usuario en Railway:
    En Railway -> Servicio **PostgreSQL** -> pestaña **Data** -> tabla `users` -> cambiar la columna `role` de `'user'` a `'admin'`.

---

## 2. Checklist de Capturas de Pantalla Requeridas

Pega estas capturas en tu documento final de Word / PDF:

### Captura 1: Validación del Formulario de Registro (OWASP A05)
* **Qué hacer**: En `https://securevault-production-583c1b9d.up.railway.app/register`, ingresa un correo inválido y una contraseña corta (ej. `12345`).
* **Qué capturar**: El formulario mostrando los mensajes descriptivos de validación de Zod:
  - *«Correo: escribe una dirección de correo válida.»*
  - *«Contraseña: usa 12 o más caracteres, con mayúscula, minúscula, número y símbolo.»*

### Captura 2: Bóveda de Notas y Perfil Enmascarado (RF-04 y RF-05)
* **Qué hacer**: Inicia sesión con `luna@umbrafiction.example`, crea la nota del *Incidente subnivel 9* y ve a la sección de **Perfil**.
* **Qué capturar**:
  1. El listado de notas mostrando el título y contenido descifrado para su dueño legítimo.
  2. La vista de perfil mostrando el teléfono protegido enmascarado: `***-***-1234`.

### Captura 3: Base de Datos Cifrada en Reposo (OWASP A04 / RF-01 / RF-04)
* **Qué hacer**: Abre tu proyecto en **Railway** -> haz clic en el servicio de **PostgreSQL** -> abre la pestaña **Data**.
* **Qué capturar**:
  1. Tabla `users`: muestra que la columna `password_hash` empieza por `$2b$12$...` (hash bcrypt irreversible) y que `phone_encrypted` es ilegible.
  2. Tabla `notes`: muestra que la columna `content_encrypted` contiene solo cadenas Base64 concatenadas por puntos (`iv.tag.ciphertext`). Ningún texto de la nota es legible directamente en la base.

### Captura 4: Aislamiento IDOR / Control de Acceso (OWASP A01)
* **Qué hacer**: Cierra sesión e inicia con `ruben@umbrafiction.example`. Intenta acceder por la URL directamente a la nota creada por Luna (ej. `/notes/<uuid-o-id-de-luna>/edit`).
* **Qué capturar**: La pantalla respondiendo `404 No encontrado` o `403 Denegado`, impidiendo ver o modificar datos de otros usuarios.

### Captura 5: Panel de Administración y Bitácora de Auditoría (OWASP A09 / RF-07)
* **Qué hacer**: Inicia sesión con la cuenta a la que asignaste rol `admin` y entra al panel de administración (`/admin` o enlace de Administrador).
* **Qué capturar**: La tabla de `audit_logs` con los eventos registrados en tiempo real (`login_success`, `login_failed`, `access_denied`), mostrando IP y fecha, y **demostrando la ausencia total de contraseñas o tokens** en los registros.

### Captura 6: Protección contra Fuerza Bruta / Rate Limiting (OWASP A07)
* **Qué hacer**: En la página de login, intenta ingresar contraseñas erróneas 6 veces consecutivas.
* **Qué capturar**: El mensaje de bloqueo `HTTP 429 Demasiadas peticiones` (o mensaje de límite excedido).

### Captura 7: Entorno de Producción en Railway y Variables de Entorno (Fase 3)
* **Qué hacer**: Abre Railway en tu navegador.
* **Qué capturar**:
  1. Vista general del canvas mostrando el servicio web `SecureVault` conectado a `PostgreSQL` y con estado *Active / Deployed*.
  2. Pestaña **Variables** del servicio web mostrando las claves: `NODE_ENV`, `DATABASE_URL`, `DATA_ENCRYPTION_KEY`, `SESSION_SECRET`, `APP_ORIGIN` (puedes ocultar el valor de las llaves en la captura con la opción de Railway).
  3. La respuesta de salud en el navegador: `https://securevault-production-583c1b9d.up.railway.app/health` (`{"status":"ok"}`).

### Captura 8: Repositorio Git y Commits (Fase 2)
* **Qué hacer**: En GitHub, ve a la pestaña de **Commits** del repositorio `Laboratorio_NodeJS_OWASP_Deploy`.
* **Qué capturar**: La lista de commits descriptivos mostrando el progreso (`fix: explain registration validation failures`, `fix: bind server to Railway network host`, etc.).

---

## 3. Preguntas de Análisis Respondidas (Páginas 5 y 7 del PDF)

Incluye estas respuestas en tu informe final de seguridad:

### Pregunta 1 (Pág. 5): ¿Qué ocurre con los datos si se pierde la llave de cifrado (`DATA_ENCRYPTION_KEY`)?
**Respuesta**:
> Si se pierde la llave `DATA_ENCRYPTION_KEY`, los datos almacenados bajo cifrado simétrico AES-256-GCM (como el contenido de las notas y los números telefónicos) se vuelven **matemáticamente irrecuperables**. Al ser un algoritmo de cifrado autenticado de alta seguridad sin puertas traseras, no existe ningún método computacional factible para reconstruir el texto en claro. Este comportamiento es un riesgo residual deliberado del cifrado fuerte, mitigado mediante la custodia segura de secretos en el gestor de la plataforma de producción y respaldos redundantes fuera de línea.

### Pregunta 2 (Pág. 5): ¿Cómo rotarían la llave sin perder la información existente?
**Respuesta**:
> Para rotar la llave criptográfica sin interrupción ni pérdida de datos se implementa una estrategia de rotación por versiones (Key Versioning):
> 1. **Versionado de esquema**: Se agrega un campo `key_version INT NOT NULL DEFAULT 1` a las tablas con campos cifrados (`notes`, `users`).
> 2. **Configuración multi-llave**: En las variables de entorno de producción se define la llave activa `DATA_ENCRYPTION_KEY_V2` y se conserva como solo-lectura la llave anterior `DATA_ENCRYPTION_KEY_V1`.
> 3. **Proceso de migración controlada (re-cifrado)**: Un script de mantenimiento por lotes lee cada registro, lo descifra utilizando la versión indicada en `key_version` con su llave correspondiente (V1), genera un nuevo vector de inicialización (IV) único y lo vuelve a cifrar con la nueva llave (V2), actualizando `key_version = 2`.
> 4. **Retiro seguro**: Una vez que todos los registros en la base de datos han sido re-cifrados a la versión 2, la llave V1 se retira definitivamente del gestor de secretos.

### Pregunta 3 (Pág. 7): ¿Qué implica `trust proxy: 1` en Express?
**Respuesta**:
> En entornos de producción detrás de un balanceador o proxy inverso (como Railway o Render), el tráfico HTTPS termina en el proxy y la comunicación interna hacia el proceso Node.js se realiza sobre HTTP privado. Al configurar `app.set('trust proxy', 1)`:
> 1. Express confía en el primer encabezado `X-Forwarded-Proto` y `X-Forwarded-For` añadido por el proxy de Railway.
> 2. Permite que `req.secure` sea `true`, habilitando el envío correcto de cookies con atributo `Secure` (evitando que el navegador las descarte).
> 3. Permite que los middlewares de Rate Limiting (`express-rate-limit`) identifiquen la IP pública real del cliente y no la IP interna compartida del proxy, previniendo bloqueos involuntarios a todos los usuarios.

---

## 4. Datos para el Canal Privado del Docente

El PDF exige:
> *«Credenciales de prueba (un usuario y un administrador) entregadas al docente por canal privado, no en el README.»*

Prepara este texto para enviar al profesor por mensaje privado o en la entrega del aula virtual:

```text
Estimado profesor, adjunto las credenciales de prueba para la evaluación de SecureVault en producción:

URL pública: https://securevault-production-583c1b9d.up.railway.app
Repositorio: https://github.com/biancarobleshurtado27/Laboratorio_NodeJS_OWASP_Deploy

Credenciales de prueba:
1. Rol Usuario Estándar:
   - Correo: luna@umbrafiction.example
   - Contraseña: ClaveSegura2026!
   - Función: CRUD de notas privadas, datos cifrados con AES-256-GCM.

2. Rol Administrador:
   - Correo: admin@umbrafiction.example
   - Contraseña: ClaveSegura2026!
   - Función: Panel de administración y consulta de bitácora de auditoría en tiempo real.
```
