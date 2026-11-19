// CAPA DE PRESENTACIÓN (GUI).
// Maneja el DOM y muestra lo que devuelve la API. Las decisiones de permisos
// se comprueban en el servidor; aquí sólo se muestra u oculta información.
class App {
  constructor(api) {
    this.api = api;
    this.currentUser = null;
    this.elements = {};
  }

  init() {
    const ids = [
      'msg', 'sessionInfo', 'logoutBtn', 'deleteMeBtn', 'authPanel',
      'loginForm', 'registerForm', 'loginEmail', 'loginPassword',
      'registerEmail', 'registerPassword', 'googleLink', 'adminPanel',
      'usersTableBody', 'reloadUsersBtn',
    ];
    ids.forEach((id) => { this.elements[id] = document.getElementById(id); });

    this.elements.loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.login();
    });
    this.elements.registerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.register();
    });
    this.elements.logoutBtn.addEventListener('click', () => this.logout());
    this.elements.deleteMeBtn.addEventListener('click', () => this.deleteMe());
    this.elements.reloadUsersBtn.addEventListener('click', () => this.loadUsers());

    this.showQueryMessages();
    this.api.googleStatus()
      .then((data) => { this.elements.googleLink.hidden = !data.enabled; })
      .catch(() => { this.elements.googleLink.hidden = true; });
    this.refresh();
  }

  showQueryMessages() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmed')) this.showMessage('Cuenta confirmada. Ya puedes iniciar sesión.', 'success');
    if (params.get('error') === 'oauth') this.showMessage('No se pudo completar el acceso con Google.', 'danger');
    else if (params.get('error')) this.showMessage(params.get('error'), 'danger');
  }

  showMessage(text, type = 'info') {
    const box = this.elements.msg;
    box.className = `alert alert-${type}`;
    box.textContent = text;
    box.hidden = false;
  }

  clearMessage() {
    this.elements.msg.hidden = true;
  }

  async run(action) {
    this.clearMessage();
    try {
      await action();
    } catch (error) {
      this.showMessage(error.message || 'Error inesperado', 'danger');
    }
  }

  async refresh() {
    try {
      const data = await this.api.me();
      this.currentUser = data.user;
      this.showAuthenticated();
      if (this.currentUser.role === 'admin') await this.loadUsers();
    } catch (error) {
      this.currentUser = null;
      this.showGuest();
    }
  }

  showAuthenticated() {
    const user = this.currentUser;
    this.elements.sessionInfo.textContent = `Sesión: ${user.email} (${user.role})`;
    this.elements.logoutBtn.hidden = false;
    this.elements.deleteMeBtn.hidden = false;
    this.elements.authPanel.hidden = true;
    this.elements.adminPanel.hidden = user.role !== 'admin';
  }

  showGuest() {
    this.elements.sessionInfo.textContent = 'No has iniciado sesión';
    this.elements.logoutBtn.hidden = true;
    this.elements.deleteMeBtn.hidden = true;
    this.elements.authPanel.hidden = false;
    this.elements.adminPanel.hidden = true;
    this.elements.usersTableBody.innerHTML = '';
  }

  async login() {
    await this.run(async () => {
      const email = this.elements.loginEmail.value.trim();
      const password = this.elements.loginPassword.value;
      const data = await this.api.login(email, password);
      this.showMessage(data.message, 'success');
      await this.refresh();
    });
  }

  async register() {
    await this.run(async () => {
      const email = this.elements.registerEmail.value.trim();
      const password = this.elements.registerPassword.value;
      const data = await this.api.register(email, password);
      this.showMessage(data.message, 'success');
      this.elements.registerForm.reset();
    });
  }

  async logout() {
    await this.run(async () => {
      const data = await this.api.logout();
      this.showMessage(data.message, 'success');
      await this.refresh();
    });
  }

  async deleteMe() {
    await this.run(async () => {
      if (!this.currentUser) return;
      const data = await this.api.deleteUser(this.currentUser.id);
      this.showMessage(data.message, 'success');
      await this.refresh();
    });
  }

  async loadUsers() {
    await this.run(async () => {
      const data = await this.api.listUsers();
      const tbody = this.elements.usersTableBody;
      tbody.innerHTML = '';
      data.users.forEach((user) => {
        const row = document.createElement('tr');
        [user.email, user.role, user.status].forEach((value) => {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.appendChild(cell);
        });
        [['active', '¿Activo?', 'btn-outline-info'], ['delete', 'Eliminar', 'btn-outline-danger']]
          .forEach(([action, label, style]) => {
            const cell = document.createElement('td');
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `btn btn-sm ${style}`;
            button.textContent = label;
            button.dataset.action = action;
            button.dataset.id = user.id;
            cell.appendChild(button);
            row.appendChild(cell);
          });
        tbody.appendChild(row);
      });

      tbody.querySelectorAll('button[data-action]').forEach((button) => {
        button.addEventListener('click', () => {
          if (button.dataset.action === 'active') {
            this.checkActive(button.dataset.id);
          } else {
            this.deleteUser(button.dataset.id);
          }
        });
      });
    });
  }

  async checkActive(id) {
    await this.run(async () => {
      const data = await this.api.checkActive(id);
      this.showMessage(data.active ? 'El usuario está activo' : 'El usuario no está activo', 'info');
    });
  }

  async deleteUser(id) {
    await this.run(async () => {
      const data = await this.api.deleteUser(id);
      this.showMessage(data.message, 'success');
      await this.loadUsers();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App(new window.ApiClient());
  window.app.init();
});
