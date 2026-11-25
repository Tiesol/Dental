import { es } from 'date-fns/locale';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

// La API habla en UTC; solo aquí se convierte a la hora de la clínica para mostrar o enviar.
const ZONE = (import.meta.env.VITE_CLINIC_TIMEZONE as string | undefined) ?? 'America/La_Paz';

const format = (date: string | Date, pattern: string) =>
  formatInTimeZone(date, ZONE, pattern, { locale: es });

// 540 -> "09:00"
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

// "09:00" -> 540
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Fecha y hora de la clínica ("yyyy-MM-ddTHH:mm") a ISO UTC.
export function localDateTimeToIso(value: string): string {
  return fromZonedTime(value, ZONE).toISOString();
}

export function formatTime(iso: string): string {
  return format(iso, 'HH:mm');
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function formatDate(iso: string): string {
  return format(iso, "EEEE, d 'de' MMMM 'de' yyyy");
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

// Día de la clínica de un instante (YYYY-MM-DD), como lo espera la API.
export function dateInClinic(iso: string): string {
  return format(iso, 'yyyy-MM-dd');
}

// Fecha de hoy en la clínica (YYYY-MM-DD), como la espera la API.
export function todayInClinic(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
