import { applyDecorators } from '@nestjs/common';
import { IsISO8601, Matches } from 'class-validator';

// IsISO8601 descarta fechas inexistentes, pero también acepta formatos que Date no entiende (como
// semanas) y fechas sin zona, que se interpretarían en la zona del servidor. Por eso se exige
// además esta forma.
const FECHA_HORA_CON_ZONA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export function IsFechaHoraConZona(campo: string) {
  const message = `${campo} debe ser una fecha y hora ISO 8601 con zona horaria`;
  return applyDecorators(
    IsISO8601({ strict: true }, { message }),
    Matches(FECHA_HORA_CON_ZONA, { message }),
  );
}
