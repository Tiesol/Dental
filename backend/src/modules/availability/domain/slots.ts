import { addMinutes } from 'date-fns';
import { calculateEndTime } from '../../appointments/domain/end-time';
import { Interval, overlaps } from '../../appointments/domain/overlap';

// Cada cuánto se ofrece un horario (D3 de PLAN.md). El PDF solo exige considerar la duración.
export const SLOT_STEP_MIN = 15;

// La única definición de "horario disponible": recibe instantes ya convertidos a UTC y devuelve
// los intervalos libres, ordenados. Un horario es válido si cabe entero en un tramo, no toca un
// bloque, no se solapa con una cita activa y no empieza antes de ahora (PDF sección 5).
export function calculateSlots({
  timeRanges,
  blocks,
  appointments,
  duracionMin: durationMin,
  now,
  stepMin,
}: {
  timeRanges: Interval[];
  blocks: Interval[];
  appointments: Interval[];
  duracionMin: number;
  now: Date;
  stepMin: number;
}): Interval[] {
  const busySlots = [...blocks, ...appointments];
  const slots: Interval[] = [];
  const sorted = [...timeRanges].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  for (const timeRange of sorted) {
    for (let start = timeRange.inicio; ; start = addMinutes(start, stepMin)) {
      const slot = { inicio: start, fin: calculateEndTime(start, durationMin) };
      if (slot.fin > timeRange.fin) break;
      if (start >= now && !busySlots.some((busy) => overlaps(slot, busy))) {
        slots.push(slot);
      }
    }
  }
  return slots;
}
