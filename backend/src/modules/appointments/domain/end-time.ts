import { addMinutes } from 'date-fns';

// La hora de fin la calcula siempre el backend: nunca la envía el cliente (PDF sección 6).
export function calcularHoraFin(inicio: Date, duracionMin: number): Date {
  return addMinutes(inicio, duracionMin);
}
