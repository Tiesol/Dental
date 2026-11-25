import { addMinutes } from 'date-fns';

// La hora de fin la calcula siempre el backend: nunca la envía el cliente (PDF sección 6).
export function calculateEndTime(start: Date, durationMin: number): Date {
  return addMinutes(start, durationMin);
}
