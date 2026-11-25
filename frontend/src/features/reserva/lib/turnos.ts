import type { SlotResponse } from '@/api/types';
import { formatearHora } from '@/shared/lib/dates';

export type Turno = { nombre: 'Mañana' | 'Tarde'; slots: SlotResponse[] };

// Separa los horarios por turno según la hora de la clínica (antes o después de las 12:00). Los
// turnos sin horarios no se devuelven.
export function agruparPorTurno(slots: SlotResponse[]): Turno[] {
  const turnos: Turno[] = [
    { nombre: 'Mañana', slots: [] },
    { nombre: 'Tarde', slots: [] },
  ];
  for (const slot of slots) {
    const hora = Number(formatearHora(slot.inicio).slice(0, 2));
    turnos[hora < 12 ? 0 : 1].slots.push(slot);
  }
  return turnos.filter((t) => t.slots.length > 0);
}

// Todos los horarios de una consulta duran lo mismo: la duración del servicio.
export function minutosDeSlot(slot: SlotResponse): number {
  return Math.round((Date.parse(slot.fin) - Date.parse(slot.inicio)) / 60_000);
}
