// Errores del dominio. La capa API los traduce a códigos HTTP.
class DomainError extends Error {
  constructor(message, status) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

class ValidationError extends DomainError {
  constructor(message) { super(message, 400); }
}

class UnauthorizedError extends DomainError {
  constructor(message = 'Debes iniciar sesión') { super(message, 401); }
}

class ForbiddenError extends DomainError {
  constructor(message = 'No tienes permiso para esta operación') { super(message, 403); }
}

class EmailNotConfirmedError extends ForbiddenError {
  constructor() { super('Debes confirmar tu correo electrónico antes de iniciar sesión'); }
}

class NotFoundError extends DomainError {
  constructor(message = 'Recurso no encontrado') { super(message, 404); }
}

class ConflictError extends DomainError {
  constructor(message = 'El recurso ya existe') { super(message, 409); }
}

module.exports = {
  DomainError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  EmailNotConfirmedError,
  NotFoundError,
  ConflictError,
};
