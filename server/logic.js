// CAPA DE LÓGICA DE NEGOCIO.
// Todas las reglas de gestión de usuarios viven aquí, independientes de
// Express, MongoDB y del cliente. Las restricciones de roles se comprueban
// también aquí (no sólo ocultando botones en la interfaz).
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  EmailNotConfirmedError,
  NotFoundError,
  ConflictError,
  DomainError,
} = require('./errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 12;

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

function normalizeEmail(email) {
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    throw new ValidationError('Introduce un correo electrónico válido');
  }
  return email.trim().toLowerCase();
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new ValidationError('La contraseña debe tener al menos 8 caracteres');
  }
  return password;
}

class UserService {
  constructor(repository, { mailer, logger } = {}) {
    if (!repository) throw new Error('UserService necesita un repositorio');
    this.repo = repository;
    this.mailer = mailer || {
      async sendConfirmationEmail() {
        // No hay servicio de correo: no es un error de la lógica de negocio.
      },
    };
    this.logger = logger || { info() {}, warn() {}, error() {} };
  }

  async getById(id) {
    const user = await this.repo.findById(id);
    return user ? publicUser(user) : null;
  }

  async register({ email, password }) {
    const normalized = normalizeEmail(email);
    validatePassword(password);

    if (await this.repo.findByEmail(normalized)) {
      throw new ConflictError('Ya existe una cuenta con ese correo electrónico');
    }

    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const stored = await this.repo.create({
      id: crypto.randomUUID(),
      email: normalized,
      passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
      role: 'user',
      status: 'pending',
      confirmationToken,
      createdAt: new Date().toISOString(),
    });

    try {
      await this.mailer.sendConfirmationEmail(stored.email, confirmationToken);
    } catch (error) {
      // Compensación: si no se puede enviar el correo, no dejamos una cuenta
      // pendiente que nadie podría confirmar. Así se puede repetir el registro.
      await this.repo.remove(stored.id);
      this.logger.error('No se pudo enviar el correo de confirmación', error.message);
      throw new DomainError('No se pudo enviar el correo de confirmación. Inténtalo más tarde.', 502);
    }

    this.logger.info(`Registro pendiente de confirmación: ${stored.email}`);
    return { user: publicUser(stored), emailSent: true };
  }

  async confirm(token) {
    if (typeof token !== 'string' || !token) {
      throw new ValidationError('Token de confirmación no válido');
    }
    const user = await this.repo.findByConfirmationToken(token);
    if (!user) {
      throw new ValidationError('El enlace de confirmación no es válido o ya se usó');
    }
    const updated = await this.repo.update(user.id, {
      status: 'active',
      confirmationToken: null,
    });
    this.logger.info(`Cuenta confirmada: ${user.email}`);
    return publicUser(updated);
  }

  async login({ email, password }) {
    const normalized = normalizeEmail(email);
    if (typeof password !== 'string') {
      throw new ValidationError('Introduce la contraseña');
    }

    const user = await this.repo.findByEmail(normalized);
    if (!user || !user.passwordHash) {
      // Mensaje genérico para no revelar qué correos están registrados.
      throw new UnauthorizedError('Correo o contraseña incorrectos');
    }
    if (user.status === 'pending') {
      throw new EmailNotConfirmedError();
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedError('Correo o contraseña incorrectos');
    }

    this.logger.info(`Inicio de sesión: ${user.email}`);
    return publicUser(user);
  }

  // Los usuarios de OAuth se consideran confirmados (Apartado 4.2).
  async oauthUser(profile) {
    const email = normalizeEmail(profile.email || profile.emails?.[0]?.value);
    const existing = await this.repo.findByEmail(email);
    if (existing) {
      if (existing.status !== 'active') {
        const updated = await this.repo.update(existing.id, {
          status: 'active',
          confirmationToken: null,
        });
        this.logger.info(`Cuenta activada vía OAuth: ${email}`);
        return publicUser(updated);
      }
      this.logger.info(`Inicio de sesión OAuth: ${email}`);
      return publicUser(existing);
    }

    const created = await this.repo.create({
      id: crypto.randomUUID(),
      email,
      passwordHash: null,
      role: 'user',
      status: 'active',
      confirmationToken: null,
      createdAt: new Date().toISOString(),
    });
    this.logger.info(`Usuario OAuth creado: ${email}`);
    return publicUser(created);
  }

  assertAdmin(actor) {
    if (!actor || actor.role !== 'admin') {
      throw new ForbiddenError('Esta operación requiere el rol de administrador');
    }
  }

  async listUsers(actor) {
    this.assertAdmin(actor);
    const users = await this.repo.list();
    return users.map(publicUser);
  }

  async isActive(actor, id) {
    this.assertAdmin(actor);
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    // Un usuario eliminado no aparece en el repositorio; activo equivale a
    // "correo confirmado (o OAuth) y no eliminado".
    return { id: user.id, active: user.status === 'active' };
  }

  async deleteUser(actor, id) {
    if (!actor) throw new UnauthorizedError();
    if (actor.role !== 'admin' && actor.id !== id) {
      throw new ForbiddenError('Sólo puedes eliminar tu propia cuenta');
    }
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    await this.repo.remove(id);
    this.logger.info(`Usuario eliminado: ${user.email} (por ${actor.email})`);
    return { id: user.id };
  }

  // Se usa desde el script de inicialización, nunca desde una ruta pública.
  async createAdmin({ email, password }) {
    const normalized = normalizeEmail(email);
    validatePassword(password);
    if (await this.repo.findByEmail(normalized)) {
      throw new ConflictError('Ya existe una cuenta con ese correo electrónico');
    }
    const created = await this.repo.create({
      id: crypto.randomUUID(),
      email: normalized,
      passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
      role: 'admin',
      status: 'active',
      confirmationToken: null,
      createdAt: new Date().toISOString(),
    });
    this.logger.info(`Administrador creado: ${normalized}`);
    return publicUser(created);
  }

  async promoteToAdmin(id) {
    const updated = await this.repo.update(id, { role: 'admin', status: 'active' });
    if (!updated) throw new NotFoundError('Usuario no encontrado');
    this.logger.info(`Usuario promovido a administrador: ${updated.email}`);
    return publicUser(updated);
  }
}

module.exports = { UserService, publicUser, normalizeEmail, validatePassword };
