import { addMinutes } from 'date-fns';
import { calcularHoraFin } from '../../appointments/domain/end-time';
import { Intervalo, seSolapan } from '../../appointments/domain/overlap';

// Cada cuánto se ofrece un horario (D3 de PLAN.md). El PDF solo exige considerar la duración.
export const PASO_SLOTS_MIN = 15;

// La única definición de "horario disponible": recibe instantes ya convertidos a UTC y devuelve
// los intervalos libres, ordenados. Un horario es válido si cabe entero en un tramo, no toca un
// bloque, no se solapa con una cita activa y no empieza antes de ahora (PDF sección 5).
export function calcularSlots({
  tramos,
  bloques,
  citas,
  duracionMin,
  ahora,
  pasoMin,
}: {
  tramos: Intervalo[];
  bloques: Intervalo[];
  citas: Intervalo[];
  duracionMin: number;
  ahora: Date;
  pasoMin: number;
}): Intervalo[] {
  const ocupados = [...bloques, ...citas];
  const slots: Intervalo[] = [];
  const ordenados = [...tramos].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  for (const tramo of ordenados) {
    for (let inicio = tramo.inicio; ; inicio = addMinutes(inicio, pasoMin)) {
      const slot = { inicio, fin: calcularHoraFin(inicio, duracionMin) };
      if (slot.fin > tramo.fin) break;
      if (inicio >= ahora && !ocupados.some((ocupado) => seSolapan(slot, ocupado))) {
        slots.push(slot);
      }
    }
  }
  return slots;
}
