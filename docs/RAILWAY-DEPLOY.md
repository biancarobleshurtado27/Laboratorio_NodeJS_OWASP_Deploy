# Despliegue de SecureVault en Railway

## 1. Crear los servicios

1. En Railway crea un proyecto y elige **Deploy from GitHub Repo**.
2. Selecciona `biancarobleshurtado27/Laboratorio_NodeJS_OWASP_Deploy` y la rama `main`.
3. En el canvas del mismo proyecto agrega **PostgreSQL**. Déjalo privado: la base no necesita dominio público.
4. Abre el servicio de SecureVault y entra a **Variables**. Agrega `DATABASE_URL` con la referencia `${{Postgres.DATABASE_URL}}`. Si tu servicio de base se llama distinto, sustituye `Postgres` por ese nombre exacto.

## 2. Secretos del servicio web

En **Variables** del servicio web agrega estos valores. Nunca copies el `.env` local ni publiques los valores en GitHub.

| Variable | Valor en Railway |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `DATABASE_SSL` | `true` |
| `SESSION_SECRET` | Cadena aleatoria de 48 o más caracteres |
| `ACCESS_TOKEN_SECRET` | Otra cadena aleatoria distinta, 48 o más caracteres |
| `DATA_ENCRYPTION_KEY` | Base64 de 32 bytes generado con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `DISPLAY_TIME_ZONE` | `America/Costa_Rica` |
| `APP_ORIGIN` | La URL HTTPS generada en el paso 4; se agrega después del primer despliegue |

No declares `PORT`: Railway la proporciona automáticamente. El archivo `railway.json` ejecuta la migración, revisa `GET /health` y reinicia el servicio si falla.

## 3. Primer despliegue y dominio

1. Despliega el servicio sin `APP_ORIGIN` y revisa el log hasta que aparezca `securevault_started`. En este único arranque inicial, SecureVault solo acepta el mismo origen de cada solicitud para que Railway pueda crear el dominio.
2. En **Settings -> Networking -> Public Networking**, pulsa **Generate Domain**.
3. Railway creará una URL `https://...up.railway.app` con certificado TLS automático. Copia esa URL en `APP_ORIGIN`, guarda y vuelve a desplegar.
4. Comprueba `https://tu-dominio.up.railway.app/health`; debe responder `{ "status": "ok" }`.

## 4. Verificación antes de entregar

- Registra una cuenta de prueba y convierte solo la cuenta entregada al docente en administrador.
- No habilites el usuario demo local en Railway: el servicio web de Railway no ejecuta `db:seed`.
- Revisa que las cookies tengan `Secure`, `HttpOnly` y `SameSite=Lax`.
- Ejecuta `npm audit`, OWASP ZAP baseline, SecurityHeaders y SSL Labs sobre la URL propia.
- Entrega usuario/contraseña de prueba al docente mediante un canal privado, no en el README.

## Fuentes

- [Railway Dockerfiles](https://docs.railway.com/builds/dockerfiles)
- [Railway PostgreSQL](https://docs.railway.com/databases/postgresql)
- [Railway Public Networking](https://docs.railway.com/networking/public-networking)
- [Railway Healthchecks](https://docs.railway.com/deployments/healthchecks)
