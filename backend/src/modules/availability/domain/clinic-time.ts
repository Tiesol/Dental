import { Intervalo } from '../../appointments/domain/overlap';
import { AvailabilityRuleInput } from './availability';

export function assertFechaValida(_fecha: string): void {
  throw new Error('sin implementar');
}

export function diaSemanaDe(_fecha: string): number {
  throw new Error('sin implementar');
}

export function tramosDelDia(
  _fecha: string,
  _horarios: AvailabilityRuleInput[],
  _zona: string,
): Intervalo[] {
  throw new Error('sin implementar');
}

export function rangoDelDia(_fecha: string, _zona: string): Intervalo {
  throw new Error('sin implementar');
}

export function fechaEnZona(_instante: Date, _zona: string): string {
  throw new Error('sin implementar');
}
