// Crea (o promociona) al primer administrador.
// Uso: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run bootstrap:admin
// Las credenciales se pasan por entorno; nunca se escriben en el repositorio.
require('dotenv').config();
const config = require('./config');
const logger = require('./logger');
const { MongoUserRepository } = require('./data');
const { UserService } = require('./logic');

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD en el entorno antes de ejecutar este script');
  }
  if (!config.mongodbUri) {
    throw new Error('MONGODB_URI es obligatoria para crear el administrador');
  }

  const { repository, client } = await MongoUserRepository.connect(config.mongodbUri, config.mongodbDb);
  try {
    const userService = new UserService(repository, { logger });
    const existing = await repository.findByEmail(email);
    const admin = existing
      ? await userService.promoteToAdmin(existing.id)
      : await userService.createAdmin({ email, password });
    logger.info(`Administrador disponible: ${admin.email} (rol: ${admin.role})`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  logger.error('No se pudo inicializar el administrador', error.message);
  process.exit(1);
});
