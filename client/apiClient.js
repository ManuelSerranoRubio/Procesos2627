// CAPA DE COMUNICACIÓN CON EL SERVIDOR.
// Aquí sólo se construyen peticiones HTTP y se interpretan respuestas.
// No contiene reglas de negocio ni accede a la base de datos.
class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

class ApiClient {
  async request(path, options = {}) {
    const init = { credentials: 'same-origin', ...options };
    if (options.body) {
      init.headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    }
    let response;
    try {
      response = await fetch(path, init);
    } catch (error) {
      throw new ApiError('No se pudo conectar con el servidor', 0);
    }

    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      // Respuestas vacías (por ejemplo, después de un redirect) son válidas.
    }
    if (!response.ok) {
      throw new ApiError(data.error || `Error ${response.status}`, response.status);
    }
    return data;
  }

  register(email, password) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  logout() {
    return this.request('/api/auth/logout', { method: 'POST' });
  }

  me() {
    return this.request('/api/auth/me');
  }

  googleStatus() {
    return this.request('/api/auth/google/status');
  }

  listUsers() {
    return this.request('/api/users');
  }

  checkActive(id) {
    return this.request(`/api/users/${encodeURIComponent(id)}/active`);
  }

  deleteUser(id) {
    return this.request(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
}

window.ApiClient = ApiClient;
window.ApiError = ApiError;
