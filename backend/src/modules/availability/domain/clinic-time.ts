import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { FechaInvalidaError } from '../../../common/errors/domain-error';
import { Intervalo } from '../../appointments/domain/overlap';
import { AvailabilityRuleInput } from './availability';

// Fecha (YYYY-MM-DD) como medianoche UTC: sirve para operar con el calendario, sin ninguna zona.
const comoCalendario = (fecha: string) => new Date(`${fecha}T00:00:00.000Z`);

// Instante real de un minuto del día en la zona de la clínica. El minuto 1440 cae en el día
// siguiente, y fromZonedTime aplica el desfase vigente en esa fecha.
function instanteEnZona(fecha: string, minuto: number, zona: string): Date {
  const reloj = new Date(comoCalendario(fecha).getTime() + minuto * 60_000);
  return fromZonedTime(reloj.toISOString().slice(0, 19), zona);
}

// Limita el año para que el día siguiente de cualquier fecha aceptada siga siendo representable.
function existeEnElCalendario(fecha: string): boolean {
  if (!/^[12]\d{3}-\d{2}-\d{2}$/.test(fecha)) return false;
  const calendario = comoCalendario(fecha);
  // Date puede correr 2026-02-30 a marzo: por eso se compara de vuelta contra el texto.
  return !isNaN(calendario.getTime()) && calendario.toISOString().slice(0, 10) === fecha;
}

export function assertFechaValida(fecha: string): void {
  if (!existeEnElCalendario(fecha)) {
    throw new FechaInvalidaError('La fecha debe tener el formato YYYY-MM-DD y existir');
  }
}

// El día de la semana depende solo de la fecha del calendario, no de la zona del servidor.
export function diaSemanaDe(fecha: string): number {
  return comoCalendario(fecha).getUTCDay();
}

export function tramosDelDia(
  fecha: string,
  horarios: AvailabilityRuleInput[],
  zona: string,
): Intervalo[] {
  return horarios.map(({ minutoInicio, minutoFin }) => ({
    inicio: instanteEnZona(fecha, minutoInicio, zona),
    fin: instanteEnZona(fecha, minutoFin, zona),
  }));
}

export function rangoDelDia(fecha: string, zona: string): Intervalo {
  return { inicio: instanteEnZona(fecha, 0, zona), fin: instanteEnZona(fecha, 1440, zona) };
}

export function fechaEnZona(instante: Date, zona: string): string {
  return formatInTimeZone(instante, zona, 'yyyy-MM-dd');
}
