// Excepciones de dominio. Los services y el dominio lanzan SOLO estas clases;
// DomainErrorFilter las traduce al formato HTTP uniforme { statusCode, error, message, details? }.
// Nunca lanzar HttpException desde services o dominio (CONVENCIONES.md sección 5).
export class DomainError extends Error {
  constructor(
    readonly statusCode: number,
    readonly error: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

// ---- Autenticación / autorización ----

export class CredencialesInvalidasError extends DomainError {
  constructor() {
    super(401, 'CREDENCIALES_INVALIDAS', 'Credenciales inválidas');
  }
}

export class UsuarioNoDisponibleError extends DomainError {
  constructor() {
    super(401, 'USUARIO_NO_DISPONIBLE', 'Usuario no disponible');
  }
}

export class EmailYaRegistradoError extends DomainError {
  constructor() {
    super(409, 'EMAIL_YA_REGISTRADO', 'El email ya está registrado');
  }
}

export class AccesoDenegadoError extends DomainError {
  constructor(message = 'No tienes permiso para este recurso') {
    super(403, 'ACCESO_DENEGADO', message);
  }
}

export class RecursoNoEncontradoError extends DomainError {
  constructor(recurso: string) {
    super(404, 'RECURSO_NO_ENCONTRADO', `${recurso} no encontrado`);
  }
}
