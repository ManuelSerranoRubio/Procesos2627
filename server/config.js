// Configuración centralizada. Los valores secretos se leen SIEMPRE del entorno.
require('dotenv').config();

const port = Number(process.env.PORT || 3000);

module.exports = {
  port,
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET,
  mongodbUri: process.env.MONGODB_URI,
  mongodbDb: process.env.MONGODB_DB || 'procesos',
  appUrl: process.env.APP_URL || `http://localhost:${port}`,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  mailFrom: process.env.MAIL_FROM || process.env.SMTP_USER,
};
