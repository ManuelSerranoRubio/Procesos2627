// Pruebas unitarias de la capa de lógica (Apartado 6).
// Se ejecutan con: npm test
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { InMemoryUserRepository } = require('../server/data');
const { UserService } = require('../server/logic');
const {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  EmailNotConfirmedError,
  NotFoundError,
} = require('../server/errors');

function makeService() {
  const repo = new InMemoryUserRepository();
  const sentEmails = [];
  const mailer = {
    async sendConfirmationEmail(email, token) {
      sentEmails.push({ email, token });
    },
  };
  const logger = { info() {}, warn() {}, error() {} };
  return { service: new UserService(repo, { mailer, logger }), repo, sentEmails };
}

describe('Registro y confirmación', () => {
  it('rechaza un email ya registrado con ConflictError', async () => {
    const { service } = makeService();
    await service.register({ email: 'dup@example.com', password: 'clave-segura-123' });
    await assert.rejects(
      () => service.register({ email: 'dup@example.com', password: 'otra-clave-123' }),
      ConflictError,
    );
  });

  it('guarda la contraseña como hash, nunca en texto plano', async () => {
    const { service, repo } = makeService();
    const password = 'clave-segura-123';
    const { user } = await service.register({ email: 'hash@example.com', password });
    const stored = await repo.findById(user.id);
    assert.notEqual(stored.passwordHash, password);
    assert.equal(await bcrypt.compare(password, stored.passwordHash), true);
  });

  it('envía un token de confirmación y la cuenta queda pendiente', async () => {
    const { service, sentEmails } = makeService();
    const { user } = await service.register({ email: 'new@example.com', password: 'clave-segura-123' });
    assert.equal(user.status, 'pending');
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].email, 'new@example.com');
    assert.ok(sentEmails[0].token);
  });

  it('confirma la cuenta con el token recibido', async () => {
    const { service, sentEmails } = makeService();
    const { user } = await service.register({ email: 'ok@example.com', password: 'clave-segura-123' });
    const confirmed = await service.confirm(sentEmails[0].token);
    assert.equal(confirmed.status, 'active');
    assert.equal(confirmed.id, user.id);
    assert.equal((await service.repo.findByConfirmationToken(sentEmails[0].token)), null);
  });

  it('rechaza un token de confirmación inválido', async () => {
    const { service } = makeService();
    await assert.rejects(() => service.confirm('token-inexistente'), /no es válido/);
  });
});

describe('Inicio de sesión', () => {
  it('no permite entrar con una cuenta pendiente de confirmar', async () => {
    const { service } = makeService();
    await service.register({ email: 'pending@example.com', password: 'clave-segura-123' });
    await assert.rejects(
      () => service.login({ email: 'pending@example.com', password: 'clave-segura-123' }),
      EmailNotConfirmedError,
    );
  });

  it('permite entrar después de confirmar', async () => {
    const { service, sentEmails } = makeService();
    await service.register({ email: 'login@example.com', password: 'clave-segura-123' });
    await service.confirm(sentEmails[0].token);
    const user = await service.login({ email: 'login@example.com', password: 'clave-segura-123' });
    assert.equal(user.email, 'login@example.com');
    assert.equal(user.status, 'active');
    assert.equal(user.passwordHash, undefined);
  });

  it('rechaza una contraseña incorrecta (caso de error)', async () => {
    const { service, sentEmails } = makeService();
    await service.register({ email: 'bad@example.com', password: 'clave-segura-123' });
    await service.confirm(sentEmails[0].token);
    await assert.rejects(
      () => service.login({ email: 'bad@example.com', password: 'incorrecta' }),
      UnauthorizedError,
    );
  });
});

describe('Roles y consultas sobre usuarios', () => {
  async function seed() {
    const ctx = makeService();
    const admin = await ctx.service.createAdmin({ email: 'admin@example.com', password: 'clave-admin-123' });
    const { user: normal } = await ctx.service.register({
      email: 'normal@example.com',
      password: 'clave-normal-123',
    });
    return { ...ctx, admin, normal };
  }

  it('un usuario normal no puede listar usuarios', async () => {
    const { service, normal } = await seed();
    await assert.rejects(() => service.listUsers(normal), ForbiddenError);
  });

  it('un administrador sí puede listar usuarios', async () => {
    const { service, admin } = await seed();
    const users = await service.listUsers(admin);
    assert.equal(users.length, 2);
    assert.deepEqual(
      users.map((u) => Object.keys(u).sort()),
      users.map(() => ['email', 'id', 'role', 'status']),
    );
  });

  it('un usuario normal no puede eliminar a otro usuario', async () => {
    const { service, normal, admin } = await seed();
    await assert.rejects(() => service.deleteUser(normal, admin.id), ForbiddenError);
  });

  it('un usuario normal sí puede eliminar su propia cuenta', async () => {
    const { service, normal } = await seed();
    const result = await service.deleteUser(normal, normal.id);
    assert.equal(result.id, normal.id);
    assert.equal(await service.getById(normal.id), null);
  });

  it('el administrador puede eliminar a cualquier usuario y éste no puede volver a entrar', async () => {
    const { service, admin, normal, sentEmails } = await seed();
    await service.confirm(sentEmails[0].token);
    await service.deleteUser(admin, normal.id);
    assert.equal(await service.getById(normal.id), null);
    await assert.rejects(
      () => service.login({ email: 'normal@example.com', password: 'clave-normal-123' }),
      UnauthorizedError,
    );
  });

  it('sólo el administrador puede consultar si un usuario está activo', async () => {
    const { service, admin, normal } = await seed();
    await assert.rejects(() => service.isActive(normal, admin.id), ForbiddenError);
    assert.deepEqual(await service.isActive(admin, normal.id), { id: normal.id, active: false });
    assert.deepEqual(await service.isActive(admin, admin.id), { id: admin.id, active: true });
    await assert.rejects(() => service.isActive(admin, 'no-existe'), NotFoundError);
  });
});

describe('Usuarios OAuth', () => {
  it('se crean activos y no tienen contraseña local', async () => {
    const { service } = makeService();
    const user = await service.oauthUser({ email: 'oauth@example.com' });
    assert.equal(user.status, 'active');
    assert.equal(user.role, 'user');
    await assert.rejects(
      () => service.login({ email: 'oauth@example.com', password: 'cualquiera123' }),
      UnauthorizedError,
    );
  });
});
