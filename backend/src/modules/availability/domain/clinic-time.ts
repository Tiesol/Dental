import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { InvalidDateError } from '../../../common/errors/domain-error';
import { Interval } from '../../appointments/domain/overlap';
import { AvailabilityRuleInput } from './availability';

// Fecha (YYYY-MM-DD) como medianoche UTC: sirve para operar con el calendario, sin ninguna zona.
const asCalendar = (date: string) => new Date(`${date}T00:00:00.000Z`);

// Instante real de un minuto del día en la zona de la clínica. El minuto 1440 cae en el día
// siguiente, y fromZonedTime aplica el desfase vigente en esa fecha.
function instantInZone(date: string, minute: number, zone: string): Date {
  const clock = new Date(asCalendar(date).getTime() + minute * 60_000);
  return fromZonedTime(clock.toISOString().slice(0, 19), zone);
}

// Limita el año para que el día siguiente de cualquier fecha aceptada siga siendo representable.
function existsInCalendar(date: string): boolean {
  if (!/^[12]\d{3}-\d{2}-\d{2}$/.test(date)) return false;
  const calendar = asCalendar(date);
  // Date puede correr 2026-02-30 a marzo: por eso se compara de vuelta contra el texto.
  return !isNaN(calendar.getTime()) && calendar.toISOString().slice(0, 10) === date;
}

export function assertValidDate(date: string): void {
  if (!existsInCalendar(date)) {
    throw new InvalidDateError('La fecha debe tener el formato YYYY-MM-DD y existir');
  }
}

// El día de la semana depende solo de la fecha del calendario, no de la zona del servidor.
export function weekdayOf(date: string): number {
  return asCalendar(date).getUTCDay();
}

export function dayTimeRanges(
  date: string,
  schedule: AvailabilityRuleInput[],
  zone: string,
): Interval[] {
  return schedule.map(({ minutoInicio: startMinute, minutoFin: endMinute }) => ({
    inicio: instantInZone(date, startMinute, zone),
    fin: instantInZone(date, endMinute, zone),
  }));
}

export function dayRange(date: string, zone: string): Interval {
  return { inicio: instantInZone(date, 0, zone), fin: instantInZone(date, 1440, zone) };
}

export function dateInZone(instant: Date, zone: string): string {
  return formatInTimeZone(instant, zone, 'yyyy-MM-dd');
}
