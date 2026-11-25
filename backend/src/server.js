require('dotenv').config();
const path = require('node:path');
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pino = require('pino');
const { z } = require('zod');
const { pool, query, transaction } = require('./db');
const { encrypt, decrypt, hashResetToken, newResetToken } = require('./crypto');

const app = express();
const log = pino({ level: process.env.LOG_LEVEL || 'info', redact: ['req.headers.authorization', 'password', 'token', '*.password', '*.token'] });
const production = process.env.NODE_ENV === 'production';
if (production && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) throw new Error('A 32+ character SESSION_SECRET is required in production');
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', '..', 'frontend', 'views'));
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], scriptSrc: ["'self'"], imgSrc: ["'self'", 'data:'], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"] } }, hsts: production ? undefined : false }));
app.use(express.urlencoded({ extended: false, limit: '12kb' }));
app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'public'), { maxAge: production ? '1d' : 0, index: false }));
app.use(session({
  store: new pgSession({ pool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'development-only-change-me-please-32chars',
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, secure: production, sameSite: 'lax', maxAge: 1000 * 60 * 30 }
}));

function clientIp(req) { return String(req.ip || '').slice(0, 64); }
async function audit(event, req, actorId = null, targetId = null, metadata = {}) {
  await query('INSERT INTO audit_logs(event, actor_id, target_id, ip, metadata) VALUES($1,$2,$3,$4,$5)', [event, actorId, targetId, clientIp(req), JSON.stringify(metadata)]);
  log.info({ event, actorId, targetId, ip: clientIp(req), metadata }, 'security_event');
}
function flash(req, type, message) { req.session.flash = { type, message }; }
function csrf(req, res, next) { if (!req.session.csrf) req.session.csrf = crypto.randomBytes(32).toString('base64url'); res.locals.csrfToken = req.session.csrf; next(); }
function csrfGuard(req, res, next) { const supplied = Buffer.from(req.body.csrfToken || ''); const expected = Buffer.from(req.session.csrf || ''); if (!supplied.length || supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return res.status(403).render('error', { title: 'Solicitud rechazada', message: 'La solicitud no pudo verificarse.' }); next(); }
function requireAuth(req, res, next) { if (!req.session.user) return res.redirect('/login'); next(); }
function requireAdmin(req, res, next) { if (!req.session.user || req.session.user.role !== 'admin') { audit('access_denied', req, req.session.user?.id, null, { route: req.path }).catch(() => {}); return res.status(403).render('error', { title: 'Acceso denegado', message: 'No tienes permiso para acceder a este recurso.' }); } next(); }
function maskPhone(value) { if (!value) return 'No registrado'; const digits = value.replace(/\D/g, ''); return digits.length < 4 ? '***' : `***-***-${digits.slice(-4)}`; }
function validate(schema) { return (req, res, next) => { const result = schema.safeParse(req.body); if (!result.success) return res.status(400).render('error', { title: 'Datos inválidos', message: 'Revisa los datos ingresados e inténtalo de nuevo.' }); req.validated = result.data; next(); }; }
const registerSchema = z.object({ email: z.string().trim().email().max(254), name: z.string().trim().min(2).max(80), password: z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/), phone: z.string().trim().max(32).optional().or(z.literal('')) });
const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) });
const noteSchema = z.object({ title: z.string().trim().min(1).max(120), content: z.string().trim().min(1).max(5000) });
const passwordSchema = z.object({ password: z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/) });

app.use(csrf);
app.use((req, res, next) => { res.locals.user = req.session.user || null; res.locals.flash = req.session.flash; delete req.session.flash; next(); });
app.get('/health', (_req, res) => res.type('application/json').status(200).send({ status: 'ok' }));
app.get('/', (req, res) => res.redirect(req.session.user ? '/notes' : '/login'));
app.get('/register', (_req, res) => res.render('register', { title: 'Crear cuenta' }));
app.post('/register', csrfGuard, validate(registerSchema), async (req, res, next) => {
  try { const { email, name, password, phone } = req.validated; const hash = await bcrypt.hash(password, 12); const result = await query('INSERT INTO users(email,name,password_hash,phone_encrypted) VALUES($1,$2,$3,$4) RETURNING id,email,name,role', [email.toLowerCase(), name, hash, phone ? encrypt(phone) : null]); req.session.regenerate((err) => { if (err) return next(err); req.session.user = result.rows[0]; audit('registration', req, result.rows[0].id).catch(next); res.redirect('/notes'); }); }
  catch (error) { if (error.code === '23505') { flash(req, 'error', 'No fue posible crear la cuenta con esos datos.'); return res.redirect('/register'); } next(error); }
});
app.get('/login', (_req, res) => res.render('login', { title: 'Iniciar sesión' }));
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.', handler: (req, res) => { audit('login_rate_limited', req).catch(() => {}); res.status(429).render('error', { title: 'Demasiados intentos', message: 'Por seguridad, espera 15 minutos antes de intentarlo de nuevo.' }); } });
app.post('/login', loginLimit, csrfGuard, validate(loginSchema), async (req, res, next) => {
  try { const { email, password } = req.validated; const result = await query('SELECT id,email,name,password_hash,role,failed_logins,locked_until FROM users WHERE email=$1', [email.toLowerCase()]); const user = result.rows[0]; const locked = user?.locked_until && new Date(user.locked_until) > new Date(); const valid = user && !locked && await bcrypt.compare(password, user.password_hash); if (!valid) { if (user) { const failures = user.failed_logins + 1; const lockUntil = failures >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null; await query('UPDATE users SET failed_logins=$1, locked_until=$2 WHERE id=$3', [failures, lockUntil, user.id]); await audit('login_failed', req, user.id, null, { locked: Boolean(lockUntil) }); } else await audit('login_failed', req); flash(req, 'error', 'Correo o contraseña inválidos.'); return res.redirect('/login'); }
    await query('UPDATE users SET failed_logins=0, locked_until=NULL WHERE id=$1', [user.id]); req.session.regenerate((err) => { if (err) return next(err); req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role }; audit('login_success', req, user.id).catch(next); res.redirect('/notes'); });
  } catch (error) { next(error); }
});
app.post('/logout', requireAuth, csrfGuard, (req, res, next) => { const id = req.session.user.id; req.session.destroy((err) => { if (err) return next(err); audit('logout', req, id).catch(() => {}); res.clearCookie('connect.sid'); res.redirect('/login'); }); });

app.get('/notes', requireAuth, async (req, res, next) => { try { const result = await query('SELECT id,title,content_encrypted,created_at,updated_at FROM notes WHERE owner_id=$1 ORDER BY updated_at DESC', [req.session.user.id]); const notes = result.rows.map((n) => ({ ...n, content: decrypt(n.content_encrypted) })); res.render('notes', { title: 'Mis notas', notes }); } catch (e) { next(e); } });
app.post('/notes', requireAuth, csrfGuard, validate(noteSchema), async (req, res, next) => { try { const n = req.validated; await query('INSERT INTO notes(owner_id,title,content_encrypted) VALUES($1,$2,$3)', [req.session.user.id, n.title, encrypt(n.content)]); flash(req, 'success', 'Nota guardada cifrada correctamente.'); res.redirect('/notes'); } catch (e) { next(e); } });
async function ownedNote(req, res, next) { try { const result = await query('SELECT id,owner_id,title,content_encrypted FROM notes WHERE id=$1 AND owner_id=$2', [req.params.id, req.session.user.id]); if (!result.rows[0]) { await audit('access_denied', req, req.session.user.id, null, { resource: 'note', noteId: req.params.id }); return res.status(404).render('error', { title: 'No encontrada', message: 'La nota no existe o no tienes acceso.' }); } req.note = result.rows[0]; next(); } catch (e) { next(e); } }
app.get('/notes/:id/edit', requireAuth, ownedNote, (req, res) => res.render('edit-note', { title: 'Editar nota', note: { ...req.note, content: decrypt(req.note.content_encrypted) } }));
app.post('/notes/:id', requireAuth, csrfGuard, ownedNote, validate(noteSchema), async (req, res, next) => { try { const n = req.validated; await query('UPDATE notes SET title=$1,content_encrypted=$2,updated_at=now() WHERE id=$3 AND owner_id=$4', [n.title, encrypt(n.content), req.note.id, req.session.user.id]); flash(req, 'success', 'Nota actualizada.'); res.redirect('/notes'); } catch (e) { next(e); } });
app.post('/notes/:id/delete', requireAuth, csrfGuard, ownedNote, async (req, res, next) => { try { await query('DELETE FROM notes WHERE id=$1 AND owner_id=$2', [req.note.id, req.session.user.id]); flash(req, 'success', 'Nota eliminada.'); res.redirect('/notes'); } catch (e) { next(e); } });

app.get('/profile', requireAuth, async (req, res, next) => { try { const result = await query('SELECT email,name,phone_encrypted FROM users WHERE id=$1', [req.session.user.id]); const u = result.rows[0]; res.render('profile', { title: 'Mi perfil', profile: { ...u, phone: u.phone_encrypted ? maskPhone(decrypt(u.phone_encrypted)) : 'No registrado' } }); } catch (e) { next(e); } });
app.get('/forgot-password', (_req, res) => res.render('forgot-password', { title: 'Recuperar contraseña' }));
app.post('/forgot-password', csrfGuard, validate(z.object({ email: z.string().trim().email().max(254) })), async (req, res, next) => { try { const result = await query('SELECT id FROM users WHERE email=$1', [req.validated.email.toLowerCase()]); if (result.rows[0]) { const token = newResetToken(); await query('INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES($1,$2,now() + interval \'15 minutes\')', [result.rows[0].id, hashResetToken(token)]); await audit('password_reset_requested', req, result.rows[0].id); if (!production) log.info({ resetUrl: `${process.env.APP_ORIGIN || 'http://localhost:3000'}/reset-password/${token}` }, 'development_reset_url'); } flash(req, 'success', 'Si existe una cuenta, recibirás instrucciones para recuperar el acceso.'); res.redirect('/login'); } catch (e) { next(e); } });
app.get('/reset-password/:token', (_req, res) => res.render('reset-password', { title: 'Nueva contraseña' }));
app.post('/reset-password/:token', csrfGuard, validate(passwordSchema), async (req, res, next) => { try { const tokenHash = hashResetToken(req.params.token); const result = await transaction(async (client) => { const reset = await client.query('SELECT id,user_id FROM password_resets WHERE token_hash=$1 AND used_at IS NULL AND expires_at > now() FOR UPDATE', [tokenHash]); if (!reset.rows[0]) return null; await client.query('UPDATE password_resets SET used_at=now() WHERE id=$1', [reset.rows[0].id]); await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(req.validated.password, 12), reset.rows[0].user_id]); return reset.rows[0]; }); if (!result) return res.status(400).render('error', { title: 'Enlace inválido', message: 'El enlace no es válido o expiró.' }); await query('DELETE FROM session WHERE sess::text LIKE $1', [`%\"id\":${result.user_id}%`]); await audit('password_reset_completed', req, result.user_id); flash(req, 'success', 'Contraseña actualizada. Inicia sesión.'); res.redirect('/login'); } catch (e) { next(e); } });

app.get('/admin', requireAdmin, async (req, res, next) => { try { const [users, logs] = await Promise.all([query('SELECT id,email,name,role,created_at FROM users ORDER BY id'), query('SELECT a.event,a.ip,a.metadata,a.created_at,u.email actor FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 100')]); res.render('admin', { title: 'Administración', users: users.rows, logs: logs.rows }); } catch (e) { next(e); } });
app.post('/admin/users/:id/role', requireAdmin, csrfGuard, validate(z.object({ role: z.enum(['user', 'admin']) })), async (req, res, next) => { try { const target = Number(req.params.id); if (!Number.isSafeInteger(target) || target === req.session.user.id) return res.status(400).render('error', { title: 'Acción no permitida', message: 'No puedes cambiar tu propio rol.' }); await query('UPDATE users SET role=$1 WHERE id=$2', [req.validated.role, target]); await audit('role_changed', req, req.session.user.id, target, { role: req.validated.role }); flash(req, 'success', 'Rol actualizado.'); res.redirect('/admin'); } catch (e) { next(e); } });

app.use((req, res) => res.status(404).render('error', { title: 'No encontrada', message: 'La página solicitada no existe.' }));
app.use((err, req, res, _next) => { log.error({ err: { message: err.message, stack: err.stack }, path: req.path }, 'unhandled_error'); if (res.headersSent) return; res.status(500).render('error', { title: 'Error interno', message: 'Ocurrió un error inesperado. Inténtalo más tarde.' }); });
process.on('unhandledRejection', (reason) => { log.fatal({ reason: String(reason) }, 'unhandled_rejection'); process.exit(1); });
process.on('uncaughtException', (error) => { log.fatal({ err: error }, 'uncaught_exception'); process.exit(1); });
const port = Number(process.env.PORT || 3000);
if (require.main === module) app.listen(port, () => log.info({ port }, 'securevault_started'));
module.exports = app;
