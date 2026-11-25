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

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super(401, 'CREDENCIALES_INVALIDAS', 'Credenciales inválidas');
  }
}

export class UserUnavailableError extends DomainError {
  constructor() {
    super(401, 'USUARIO_NO_DISPONIBLE', 'Usuario no disponible');
  }
}

export class EmailAlreadyRegisteredError extends DomainError {
  constructor() {
    super(409, 'EMAIL_YA_REGISTRADO', 'El email ya está registrado');
  }
}

export class AccessDeniedError extends DomainError {
  constructor(message = 'No tienes permiso para este recurso') {
    super(403, 'ACCESO_DENEGADO', message);
  }
}

export class ResourceNotFoundError extends DomainError {
  constructor(resource: string) {
    super(404, 'RECURSO_NO_ENCONTRADO', `${resource} no encontrado`);
  }
}

// ---- Servicios ----

export class ServiceDisabledError extends DomainError {
  constructor() {
    super(
      409,
      'SERVICIO_DESHABILITADO',
      'El servicio está deshabilitado y no admite nuevas reservas',
    );
  }
}

export class DuplicateServiceNameError extends DomainError {
  constructor() {
    super(409, 'NOMBRE_DE_SERVICIO_DUPLICADO', 'Ya existe un servicio con ese nombre');
  }
}

// ---- Odontólogos ----

export class DentistDisabledError extends DomainError {
  constructor() {
    super(409, 'ODONTOLOGO_DESHABILITADO', 'El odontólogo no está aceptando nuevas citas');
  }
}

export class DentistDoesNotOfferServiceError extends DomainError {
  constructor() {
    super(409, 'ODONTOLOGO_NO_REALIZA_SERVICIO', 'El odontólogo no realiza el servicio solicitado');
  }
}

export class ServicesNotFoundError extends DomainError {
  constructor(ids: string[]) {
    super(400, 'SERVICIOS_INEXISTENTES', 'Uno o más servicios indicados no existen', { ids });
  }
}

// ---- Disponibilidad ----

export class InvalidScheduleError extends DomainError {
  constructor(message: string) {
    super(400, 'HORARIO_INVALIDO', message);
  }
}

export class InvalidDateError extends DomainError {
  constructor(message = 'La fecha no es válida') {
    super(400, 'FECHA_INVALIDA', message);
  }
}

export class BlockHasAppointmentsError extends DomainError {
  constructor() {
    super(
      409,
      'BLOQUE_CON_CITAS',
      'Hay citas activas en ese horario; cancélalas o reprográmalas antes de bloquearlo',
    );
  }
}

// ---- Citas ----

export class SlotUnavailableError extends DomainError {
  constructor() {
    super(409, 'HORARIO_NO_DISPONIBLE', 'El horario ya no está disponible');
  }
}

export class SlotInThePastError extends DomainError {
  constructor() {
    super(409, 'HORARIO_EN_EL_PASADO', 'No se puede reservar un horario que ya pasó');
  }
}

export class AppointmentAccessDeniedError extends DomainError {
  constructor() {
    super(403, 'ACCESO_DENEGADO_A_CITA', 'No tienes acceso a esta cita');
  }
}

export class AppointmentNotModifiableError extends DomainError {
  constructor() {
    super(
      409,
      'CITA_NO_MODIFICABLE',
      'Solo se puede reprogramar o cancelar una cita pendiente o confirmada',
    );
  }
}

export class InvalidStatusTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(
      409,
      'TRANSICION_DE_ESTADO_INVALIDA',
      `Una cita ${from.replace('_', ' ')} no puede pasar a ${to.replace('_', ' ')}`,
    );
  }
}

export class ObservationRequiredError extends DomainError {
  constructor() {
    super(409, 'OBSERVACION_REQUERIDA', 'Registra la observación antes de finalizar la cita');
  }
}

export class AppointmentNotInProgressError extends DomainError {
  constructor() {
    super(409, 'CITA_NO_EN_ATENCION', 'La observación se registra durante la atención');
  }
}

export class ObservationAlreadyRegisteredError extends DomainError {
  constructor() {
    super(409, 'OBSERVACION_YA_REGISTRADA', 'Esta cita ya tiene una observación registrada');
  }
}

// ---- Entorno de E2E ----

export class NotATestDatabaseError extends DomainError {
  constructor(name: string) {
    super(500, 'BASE_NO_ES_DE_TEST', `El seed de E2E no vacía la base "${name}"`);
  }
}

// ---- Gestión de usuarios ----

export class OwnAccountOperationError extends DomainError {
  constructor(message = 'No puedes desactivar tu propia cuenta') {
    super(409, 'OPERACION_SOBRE_PROPIA_CUENTA', message);
  }
}

export class WrongCurrentPasswordError extends DomainError {
  constructor() {
    super(400, 'PASSWORD_ACTUAL_INCORRECTA', 'La contraseña actual es incorrecta');
  }
}

export class FieldNotApplicableToRoleError extends DomainError {
  constructor(fields: string[], role: string) {
    super(
      400,
      'CAMPO_NO_APLICABLE_AL_ROL',
      `${fields.length > 1 ? 'Los campos' : 'El campo'} ${fields.join(', ')} no ${
        fields.length > 1 ? 'aplican' : 'aplica'
      } a un usuario con rol ${role}`,
      { campos: fields },
    );
  }
}
