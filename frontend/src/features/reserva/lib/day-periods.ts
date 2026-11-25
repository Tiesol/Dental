import type { SlotResponse } from '@/api/types';
import { formatTime } from '@/shared/lib/dates';

export type DayPeriod = { name: 'Mañana' | 'Tarde'; slots: SlotResponse[] };

// Separa los horarios por turno según la hora de la clínica (antes o después de las 12:00). Los
// turnos sin horarios no se devuelven.
export function groupByPeriod(slots: SlotResponse[]): DayPeriod[] {
  const periods: DayPeriod[] = [
    { name: 'Mañana', slots: [] },
    { name: 'Tarde', slots: [] },
  ];
  for (const slot of slots) {
    const time = Number(formatTime(slot.inicio).slice(0, 2));
    periods[time < 12 ? 0 : 1].slots.push(slot);
  }
  return periods.filter((t) => t.slots.length > 0);
}

// Todos los horarios de una consulta duran lo mismo: la duración del servicio.
export function slotMinutes(slot: SlotResponse): number {
  return Math.round((Date.parse(slot.fin) - Date.parse(slot.inicio)) / 60_000);
}
