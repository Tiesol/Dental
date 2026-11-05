import { Intervalo } from '../../appointments/domain/overlap';

export const PASO_SLOTS_MIN = 15;

export function calcularSlots(_datos: {
  tramos: Intervalo[];
  bloques: Intervalo[];
  citas: Intervalo[];
  duracionMin: number;
  ahora: Date;
  pasoMin: number;
}): Intervalo[] {
  throw new Error('sin implementar');
}
