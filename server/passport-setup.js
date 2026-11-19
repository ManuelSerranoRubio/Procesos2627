// Configuración del proveedor externo (Google OAuth 2.0).
// Las credenciales se leen del entorno: GOOGLE_CLIENT_ID,
// GOOGLE_CLIENT_SECRET y GOOGLE_CALLBACK_URL.
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

function configurePassport(config) {
  if (!config.googleClientId || !config.googleClientSecret || !config.googleCallbackUrl) {
    return false;
  }

  passport.use(new GoogleStrategy({
    clientID: config.googleClientId,
    clientSecret: config.googleClientSecret,
    callbackURL: config.googleCallbackUrl,
  }, (accessToken, refreshToken, profile, done) => {
    // Perfil mínimo: sólo necesitamos el correo para dar de alta al usuario.
    done(null, {
      email: profile.emails?.[0]?.value,
      provider: 'google',
      providerId: profile.id,
    });
  }));
  return true;
}

module.exports = { configurePassport };
