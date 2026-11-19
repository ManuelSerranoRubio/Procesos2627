// Punto de entrada del servidor.
require('dotenv').config();
const config = require('./config');
const logger = require('./logger');
const { MongoUserRepository, InMemoryUserRepository } = require('./data');
const { UserService } = require('./logic');
const { createMailer } = require('./mailer');
const { configurePassport } = require('./passport-setup');
const { createApp } = require('./api');

async function main() {
  let repository;
  let mongoClient;

  if (config.mongodbUri) {
    const connection = await MongoUserRepository.connect(config.mongodbUri, config.mongodbDb);
    repository = connection.repository;
    mongoClient = connection.client;
    logger.info('Conectado a MongoDB');
  } else {
    logger.warn('MONGODB_URI no configurada: se usa un repositorio en memoria (no persistente)');
    repository = new InMemoryUserRepository();
  }

  const loggerService = logger;
  const userService = new UserService(repository, {
    mailer: createMailer(config, loggerService),
    logger: loggerService,
  });
  const oauthEnabled = configurePassport(config);
  if (!oauthEnabled) logger.warn('Google OAuth no configurado: las rutas /api/auth/google devolverán 501');

  const app = createApp({ userService, config, logger: loggerService, oauthEnabled });
  const server = app.listen(config.port, () => {
    logger.info(`Aplicación escuchando en ${config.appUrl} (puerto ${config.port})`);
  });

  const shutdown = async () => {
    server.close(async () => {
      if (mongoClient) await mongoClient.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.error('No se pudo iniciar la aplicación', error.message);
  process.exit(1);
});
