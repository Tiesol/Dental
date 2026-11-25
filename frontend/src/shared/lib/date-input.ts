// Texto que se escribe en los campos de fecha y hora. Los valores viajan como "yyyy-MM-dd" y "HH:mm"
// (hora de la clínica); en pantalla la fecha se muestra como "dd/mm/aaaa".

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TEXT = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const TIME_TEXT = /^(\d{1,2}):(\d{2})$/;

const twoDigits = (n: number) => String(n).padStart(2, '0');

function isRealDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

// "2026-11-10" -> "10/11/2026"
export function isoToDateText(iso: string): string {
  const parts = ISO.exec(iso);
  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : '';
}

// Acepta "dd/mm/aaaa" y también "aaaa-mm-dd" (lo que llega al pegar). Devuelve el ISO o null.
export function dateTextToIso(text: string): string | null {
  const clean = text.trim();
  const iso = ISO.exec(clean);
  const local = DATE_TEXT.exec(clean);
  const [year, month, day] = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : local
      ? [Number(local[3]), Number(local[2]), Number(local[1])]
      : [0, 0, 0];
  if (!year || !isRealDate(year, month, day)) return null;
  return `${year}-${twoDigits(month)}-${twoDigits(day)}`;
}

// Inserta las barras mientras se escriben los dígitos: "10112026" -> "10/11/2026".
export function maskDate(text: string): string {
  if (ISO.test(text.trim())) return text.trim();
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// "9:5" no es válida; "9:05" -> "09:05". Devuelve "HH:mm" o null.
export function timeTextToValue(text: string): string | null {
  const parts = TIME_TEXT.exec(text.trim());
  if (!parts) return null;
  const hours = Number(parts[1]);
  const minutes = Number(parts[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${twoDigits(hours)}:${twoDigits(minutes)}`;
}

// Inserta los dos puntos mientras se escriben los dígitos: "0930" -> "09:30".
export function maskTime(text: string): string {
  if (TIME_TEXT.test(text.trim())) return text.trim();
  const digits = text.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

// Horas sugeridas cada `paso` minutos: "00:00", "00:15", ...
export function hoursOfDay(step: number): string[] {
  const hours: string[] = [];
  for (let minute = 0; minute < 24 * 60; minute += step) {
    hours.push(`${twoDigits(Math.floor(minute / 60))}:${twoDigits(minute % 60)}`);
  }
  return hours;
}
