import { es } from 'date-fns/locale';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

// La API habla en UTC; solo aquí se convierte a la hora de la clínica para mostrar o enviar.
const ZONA = (import.meta.env.VITE_CLINIC_TIMEZONE as string | undefined) ?? 'America/La_Paz';

const formatear = (fecha: string | Date, formato: string) =>
  formatInTimeZone(fecha, ZONA, formato, { locale: es });

// 540 -> "09:00"
export function minutosAHora(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  return `${String(horas).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

// "09:00" -> 540
export function horaAMinutos(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

// Valor de un <input type="datetime-local">, en hora de la clínica, a ISO UTC.
export function fechaHoraLocalAIso(valor: string): string {
  return fromZonedTime(valor, ZONA).toISOString();
}

export function formatearHora(iso: string): string {
  return formatear(iso, 'HH:mm');
}

export function formatearRangoHora(inicio: string, fin: string): string {
  return `${formatearHora(inicio)} - ${formatearHora(fin)}`;
}

export function formatearFecha(iso: string): string {
  return formatear(iso, "EEEE, d 'de' MMMM 'de' yyyy");
}

export function formatearFechaHora(iso: string): string {
  return `${formatearFecha(iso)}, ${formatearHora(iso)}`;
}

// Día de la clínica de un instante (YYYY-MM-DD), como lo espera la API.
export function fechaEnClinica(iso: string): string {
  return formatear(iso, 'yyyy-MM-dd');
}

// Fecha de hoy en la clínica (YYYY-MM-DD), como la espera la API.
export function hoyEnClinica(): string {
  return formatear(new Date(), 'yyyy-MM-dd');
}
