// Envío del correo de confirmación. Sin secretos en el código:
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD y MAIL_FROM viven en el entorno.
const nodemailer = require('nodemailer');

function createMailer(config, logger) {
  const confirmationUrl = (token) =>
    `${config.appUrl}/api/auth/confirm?token=${encodeURIComponent(token)}`;

  if (config.smtpHost && config.smtpUser && config.smtpPassword) {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: { user: config.smtpUser, pass: config.smtpPassword },
    });

    return {
      async sendConfirmationEmail(email, token) {
        const url = confirmationUrl(token);
        await transporter.sendMail({
          from: config.mailFrom,
          to: email,
          subject: 'Confirma tu cuenta',
          text: `Para activar tu cuenta, abre este enlace:\n${url}\n`,
          html: `<p>Para activar tu cuenta, pulsa <a href="${url}">aquí</a>.</p>`,
        });
        logger.info(`Correo de confirmación enviado a ${email}`);
      },
    };
  }

  // Modo desarrollo: no hay proveedor de correo configurado.
  return {
    async sendConfirmationEmail(email, token) {
      if (config.nodeEnv === 'production') {
        throw new Error('SMTP no está configurado en producción');
      }
      logger.warn(
        `SMTP no configurado. Enlace de confirmación para ${email}: ${confirmationUrl(token)}`,
      );
    },
  };
}

module.exports = { createMailer };
