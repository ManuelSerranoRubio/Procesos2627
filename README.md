# Procesos2627 — Sprint 1

Aplicación SaaS base con gestión de usuarios, separación cliente-servidor y arquitectura en capas.
El backend sirve el frontend desde el mismo origen y toda la comunicación se hace mediante una API REST.

## Tecnologías elegidas

| Tecnología | Justificación |
| --- | --- |
| Node.js + Express | Permite montar la API y servir el cliente en el mismo proceso con muy poco código y es compatible con la capa gratuita de Render. |
| MongoDB Atlas | Base de datos documental con capa gratuita y URI gestionada como secreto; los datos sobreviven al reinicio del servidor. |
| `mongodb` (driver oficial) | Acceso a datos directo y con `findOneAndUpdate`, suficiente para este proyecto sin añadir un ORM. |
| `express-session` + `connect-mongo` | Mantiene la sesión entre recargas guardando el identificador de sesión en MongoDB, e invalida la sesión al cerrar sesión o eliminar al usuario. |
| `bcryptjs` | Hash seguro de contraseñas con factor de coste, sin dependencias nativas que compliquen el despliegue. |
| Passport + `passport-google-oauth20` | Estandariza el flujo OAuth de Google y deja la lógica de usuario en nuestra capa de negocio. |
| Nodemailer | Envía el correo de confirmación por SMTP autenticado, evitando el SMTP bloqueado de los proveedores cloud. |
| `node:test` (incluido en Node) | Framework de pruebas integrado: permite automatizar los tests con un único comando sin dependencias extra. |
| GitHub Actions | Ejecuta las pruebas en cada pull request y en cada cambio de `main`, dejando evidencia del CI. |
| Render | Proveedor cloud con capa gratuita que despliega automáticamente desde `main` (CD). |

## Arquitectura y fronteras entre capas

| Capa | Ficheros | Responsabilidad |
| --- | --- | --- |
| API (backend) | `server/api.js`, `server/server.js` | Rutas HTTP, sesión, middleware de autenticación/roles, traducción de errores a JSON. No contiene reglas de negocio. |
| Lógica de negocio | `server/logic.js`, `server/errors.js` | Registro, confirmación, login, roles, consultas y borrado. Independiente de Express y de MongoDB. |
| Acceso a datos | `server/data.js` | `MongoUserRepository` en producción y `InMemoryUserRepository` en pruebas. La lógica recibe el repositorio por inyección. |
| Servicios externos | `server/mailer.js`, `server/passport-setup.js` | Correo de confirmación y Google OAuth. Sin credenciales en el código. |
| Cliente: comunicación | `client/apiClient.js` | Construye las peticiones `fetch` e interpreta respuestas. |
| Cliente: presentación | `client/index.html`, `client/app.js`, `client/styles.css` | Interfaz y eventos del DOM. No accede a datos ni decide permisos. |

El cliente **nunca** accede a MongoDB ni ejecuta lógica de negocio: sólo llama a `/api/...`.
La capa lógica no importa Express ni el driver de MongoDB, por lo que introducir la base de datos no exigió cambiar sus reglas.

## Ejecutar en local

Requisitos: Node.js 20 o superior y acceso a MongoDB Atlas (o usar el repositorio en memoria para probar sin BD).

```bash
npm ci
cp .env.example .env      # en Windows: copy .env.example .env
# Edita .env con tus valores reales (SESSION_SECRET es obligatorio)
npm start
```

Abre `http://localhost:3000`. Si `MONGODB_URI` está vacía se usa un repositorio en memoria: sirve para probar, **pero no es persistente**.
Si `SMTP_*` está vacío, el servidor imprime en consola el enlace de confirmación (sólo en desarrollo).

## Pruebas

```bash
npm test
```

Ejecuta `test/userService.test.js` con `node:test`: 15 pruebas unitarias sobre la capa de lógica, incluidos casos de error
(email duplicado, cuenta pendiente, contraseña incorrecta, usuario normal que intenta borrar a otro, consultas sin rol de administrador).
No necesitan base de datos ni servicios externos.

## Variables de entorno

Los nombres están en `.env.example`. Ningún valor real aparece en el repositorio.

`NODE_ENV`, `PORT`, `APP_URL`, `SESSION_SECRET`, `MONGODB_URI`, `MONGODB_DB`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`.

## Acceso como administrador para la revisión

El primer administrador se crea con un script, nunca con una ruta pública:

```bash
# Con MONGODB_URI configurada y ADMIN_EMAIL / ADMIN_PASSWORD en el entorno
npm run bootstrap:admin
```

Si el correo ya existe, el script lo promociona a administrador y lo activa.
Las credenciales de prueba se entregan **fuera del repositorio**, junto con la entrega del sprint.

## API REST

| Método | Ruta | Descripción | Acceso |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Registro local; crea cuenta pendiente y envía correo | Público |
| GET | `/api/auth/confirm?token=...` | Confirma la cuenta y redirige al cliente | Público |
| POST | `/api/auth/login` | Login local; crea la sesión | Público |
| POST | `/api/auth/logout` | Destruye la sesión | Autenticado |
| GET | `/api/auth/me` | Usuario de la sesión actual | Autenticado |
| GET | `/api/auth/google` / `/api/auth/google/callback` | OAuth con Google | Público |
| GET | `/api/auth/google/status` | Indica si OAuth está configurado | Público |
| GET | `/api/users` | Lista email, rol y estado | Administrador |
| GET | `/api/users/:id/active` | Consulta si la cuenta está activa | Administrador |
| DELETE | `/api/users/:id` | Elimina usuario propio o cualquiera (admin) | Autenticado |
| GET | `/api/health` | Comprobación de estado del servicio | Público |

Un usuario está *activo* cuando ha confirmado el correo (o viene de OAuth) y no ha sido eliminado.
No significa "conectado en este momento".

## Flujo de trabajo y CI/CD

- **GitHub Flow**: cada cambio se desarrolla en una rama propia, se prueban en local con `npm test` y se integra en `main` mediante pull request.
- **CI**: `.github/workflows/ci.yml` ejecuta `npm ci` y `npm test` en cada pull request y en cada push a `main`. Un PR con CI en rojo no se integra.
- **CD**: `render.yaml` describe el servicio web de Render. Al fusionar en `main`, Render reconstruye y publica automáticamente la URL pública; no se despliega a mano.
- Se recomienda etiquetar el último commit de cada hito (`hito-1`, `hito-2`, ...) una vez el CI esté en verde y la aplicación desplegada responda.

### Despliegue inicial en Render

1. Crear cuenta en Render y conectar este repositorio de GitHub.
2. Usar el blueprint `render.yaml` (o crear un *Web Service* con `npm ci` / `npm start`).
3. Rellenar en el panel de Render las variables marcadas con `sync: false` (nunca en el código).
   `APP_URL` debe ser la URL pública que asigne Render, con `https://` y sin barra final.
4. Registrar en Google Cloud las dos URIs de retorno (local y pública) con la misma ruta que `GOOGLE_CALLBACK_URL`.
5. Ejecutar `npm run bootstrap:admin` apuntando a la URI de MongoDB de producción para crear el administrador.

## Avisos

- Los correos de confirmación pueden acabar en *spam*.
- Las capas gratuitas pueden suspender el servicio tras un periodo de inactividad; la primera petición puede tardar unos segundos.
- Si Google OAuth no está configurado, el botón se oculta y las rutas devuelven `501` con un mensaje claro, en lugar de fallar el arranque.
