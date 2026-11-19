// CAPA API (presentación del backend).
// Sólo recibe peticiones HTTP, gestiona la sesión y delega en la lógica.
// No contiene reglas de negocio ni acceso directo a MongoDB.
const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const { DomainError } = require('./errors');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function createApp({ userService, config, logger, oauthEnabled = false }) {
  if (!config.sessionSecret) {
    throw new Error('Falta SESSION_SECRET. Copia .env.example a .env y rellénalo.');
  }

  const app = express();
  const clientDir = path.join(__dirname, '..', 'client');

  if (config.nodeEnv === 'production') app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const sessionOptions = {
    name: 'sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.nodeEnv === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    },
  };
  if (config.mongodbUri) {
    sessionOptions.store = MongoStore.create({
      mongoUrl: config.mongodbUri,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60,
    });
  } else {
    logger.warn('Sin MONGODB_URI: las sesiones se guardan en memoria (sólo desarrollo)');
  }
  app.use(session(sessionOptions));
  app.use(passport.initialize());

  // Carga al usuario de la sesión en cada petición. Si fue eliminado,
  // la sesión deja de ser válida inmediatamente.
  app.use(asyncHandler(async (req, res, next) => {
    if (req.session.userId) {
      const actor = await userService.getById(req.session.userId);
      if (!actor) {
        req.session = null;
      } else {
        req.actor = actor;
      }
    }
    next();
  }));

  function requireAuth(req, res, next) {
    if (!req.actor) return next(new DomainError('Debes iniciar sesión', 401));
    next();
  }

  function requireAdmin(req, res, next) {
    if (req.actor.role !== 'admin') {
      return next(new DomainError('Esta operación requiere el rol de administrador', 403));
    }
    next();
  }

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/auth/google/status', (req, res) => res.json({ enabled: oauthEnabled }));

  // ---- Autenticación local ----
  app.post('/api/auth/register', asyncHandler(async (req, res) => {
    const result = await userService.register(req.body || {});
    res.status(201).json({
      message: 'Revisa tu correo para confirmar la cuenta antes de iniciar sesión',
      user: result.user,
    });
  }));

  app.get('/api/auth/confirm', asyncHandler(async (req, res) => {
    try {
      await userService.confirm(req.query.token);
      res.redirect('/?confirmed=1');
    } catch (error) {
      res.redirect(`/?error=${encodeURIComponent(error.message)}`);
    }
  }));

  app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const user = await userService.login(req.body || {});
    req.session.userId = user.id;
    res.json({ message: 'Sesión iniciada', user });
  }));

  app.post('/api/auth/logout', (req, res) => {
    req.session = null;
    res.json({ message: 'Sesión cerrada' });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.actor }));

  // ---- OAuth (sólo si hay credenciales configuradas) ----
  if (oauthEnabled) {
    app.get('/api/auth/google', passport.authenticate('google', {
      session: false,
      scope: ['profile', 'email'],
    }));
    app.get('/api/auth/google/callback',
      passport.authenticate('google', { session: false, failureRedirect: '/?error=oauth' }),
      asyncHandler(async (req, res) => {
        const user = await userService.oauthUser(req.user);
        req.session.userId = user.id;
        res.redirect('/');
      }));
  } else {
    const unavailable = (req, res) => res.status(501).json({
      error: 'El inicio de sesión con Google no está configurado en este despliegue',
    });
    app.get('/api/auth/google', unavailable);
    app.get('/api/auth/google/callback', unavailable);
  }

  // ---- Consultas sobre usuarios (restricciones aplicadas en servidor) ----
  app.get('/api/users', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    res.json({ users: await userService.listUsers(req.actor) });
  }));

  app.get('/api/users/:id/active', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    res.json(await userService.isActive(req.actor, req.params.id));
  }));

  app.delete('/api/users/:id', requireAuth, asyncHandler(async (req, res) => {
    const result = await userService.deleteUser(req.actor, req.params.id);
    if (req.actor.id === result.id) req.session = null;
    res.json({ message: 'Usuario eliminado', id: result.id });
  }));

  // ---- Frontend: el backend sirve el cliente (mismo origen) ----
  app.use(express.static(clientDir, { index: false }));
  app.get('/', (req, res) => res.sendFile(path.join(clientDir, 'index.html')));

  app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    if (err instanceof DomainError) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido' });
    }
    logger.error('Error no esperado en la API', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

module.exports = { createApp };
