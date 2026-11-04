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

// ---- Servicios ----

export class ServicioDeshabilitadoError extends DomainError {
  constructor() {
    super(
      409,
      'SERVICIO_DESHABILITADO',
      'El servicio está deshabilitado y no admite nuevas reservas',
    );
  }
}

export class NombreDeServicioDuplicadoError extends DomainError {
  constructor() {
    super(409, 'NOMBRE_DE_SERVICIO_DUPLICADO', 'Ya existe un servicio con ese nombre');
  }
}

// ---- Odontólogos ----

export class OdontologoDeshabilitadoError extends DomainError {
  constructor() {
    super(409, 'ODONTOLOGO_DESHABILITADO', 'El odontólogo no está aceptando nuevas citas');
  }
}

export class OdontologoNoRealizaServicioError extends DomainError {
  constructor() {
    super(409, 'ODONTOLOGO_NO_REALIZA_SERVICIO', 'El odontólogo no realiza el servicio solicitado');
  }
}

export class ServiciosInexistentesError extends DomainError {
  constructor(ids: string[]) {
    super(400, 'SERVICIOS_INEXISTENTES', 'Uno o más servicios indicados no existen', { ids });
  }
}

// ---- Gestión de usuarios ----

export class OperacionSobrePropiaCuentaError extends DomainError {
  constructor(message = 'No puedes desactivar tu propia cuenta') {
    super(409, 'OPERACION_SOBRE_PROPIA_CUENTA', message);
  }
}

export class PasswordActualIncorrectaError extends DomainError {
  constructor() {
    super(400, 'PASSWORD_ACTUAL_INCORRECTA', 'La contraseña actual es incorrecta');
  }
}

export class CampoNoAplicableAlRolError extends DomainError {
  constructor(campos: string[], rol: string) {
    super(
      400,
      'CAMPO_NO_APLICABLE_AL_ROL',
      `${campos.length > 1 ? 'Los campos' : 'El campo'} ${campos.join(', ')} no ${
        campos.length > 1 ? 'aplican' : 'aplica'
      } a un usuario con rol ${rol}`,
      { campos },
    );
  }
}
