# Guion de demostración - 10 minutos

Usa personajes y una empresa completamente ficticios. No escribas nombres o secretos reales.

## Cuentas y datos ficticios

1. Registra `luna@umbrafiction.example`, nombre **Luna Mena**, con teléfono ficticio `8888-1234`.
2. Como Luna, crea estas notas:
   - **Incidente subnivel 9**: `El alien que vive debajo del edificio está trabajando mal: dejó tres portales abiertos y perdió la llave del hangar lunar.`
   - **Identidad de la CEO**: `La CEO de Umbra S.A. es realmente la persona de limpieza; trabaja encubierta para evaluar quién trata bien al personal.`
   - **La máquina de café**: `La máquina de café es un oráculo contractual. Solo predice el futuro los martes, pero exige galletas de avena.`
3. Registra `ruben@umbrafiction.example` como segundo usuario. Convierte por SQL una cuenta de prueba en admin y accede al panel.

## Recorrido

1. Muestra en PostgreSQL que `content_encrypted` no contiene texto legible y que `phone_encrypted` está cifrado. En el perfil, el teléfono termina en `1234` pero está enmascarado.
2. Con Rubén, intenta `GET /notes/<id-de-Luna>/edit`: el sistema responde 404 y la bitácora registra `access_denied`.
3. Envía `<script>alert(1)</script>` como título: el navegador lo muestra como texto, no como JavaScript. En el login intenta `admin@umbrafiction.example' OR 1=1 --`: el esquema de correo la rechaza. Aun si una cadena parecida llegara a una nota, las consultas usan parámetros `$1`, `$2` y no concatenan SQL.
4. Realiza seis inicios de sesión fallidos: se recibe 429. En el panel admin muestra los eventos, sin contraseñas ni tokens.
5. Solicita recuperación. En desarrollo, el enlace de un solo uso aparece solo en el log del servidor; úsalo una vez y prueba que un segundo uso falla.
6. En producción enseña HTTPS, `/health`, las cabeceras de Helmet, `npm audit` sin hallazgos y la ejecución verde de CI.
