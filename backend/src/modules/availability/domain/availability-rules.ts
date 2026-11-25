import { InvalidDateError, InvalidScheduleError } from '../../../common/errors/domain-error';
import {
  AvailabilityRuleInput,
  AvailabilityView,
  BlockRange,
  PublicAvailabilityView,
} from './availability';

const integerBetween = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max;

function assertValidTimeRange({
  diaSemana: weekday,
  minutoInicio: startMinute,
  minutoFin: endMinute,
}: AvailabilityRuleInput): void {
  if (!integerBetween(weekday, 0, 6)) {
    throw new InvalidScheduleError('El día de la semana debe estar entre 0 y 6');
  }
  if (!integerBetween(startMinute, 0, 1440) || !integerBetween(endMinute, 0, 1440)) {
    throw new InvalidScheduleError('Los minutos del horario deben estar entre 0 y 1440');
  }
  if (startMinute >= endMinute) {
    throw new InvalidScheduleError('El horario debe empezar antes de terminar');
  }
}

// Los tramos consecutivos son válidos porque los intervalos son semiabiertos: [540, 720) y
// [720, 900) no se solapan. Ya ordenados, si hay algún solapamiento lo hay entre dos vecinos.
function assertNoOverlaps(schedule: AvailabilityRuleInput[]): void {
  const sorted = [...schedule].sort(
    (a, b) => a.diaSemana - b.diaSemana || a.minutoInicio - b.minutoInicio,
  );
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    if (current.diaSemana === previous.diaSemana && current.minutoInicio < previous.minutoFin) {
      throw new InvalidScheduleError('Los horarios de un mismo día no pueden solaparse');
    }
  }
}

export function assertValidSchedule(schedule: AvailabilityRuleInput[]): void {
  schedule.forEach(assertValidTimeRange);
  assertNoOverlaps(schedule);
}

// Un bloque ya empezado se acepta (una pausa que surge ahora); uno ya terminado no sirve de nada.
export function assertValidBlock({ inicio: start, fin: end }: BlockRange, now: Date): void {
  if (start >= end) {
    throw new InvalidDateError('El bloque debe terminar después de empezar');
  }
  if (end <= now) {
    throw new InvalidDateError('El bloque ya terminó');
  }
}

// Proyección para PACIENTE y ODONTOLOGO: el motivo es texto libre sobre la ausencia de un
// odontólogo y solo le sirve al ADMIN, que gestiona los bloques.
export function toPublicAvailability({
  horarios: schedule,
  bloques: blocks,
}: AvailabilityView): PublicAvailabilityView {
  return {
    horarios: schedule,
    bloques: blocks.map(({ id, inicio: start, fin: end }) => ({ id, inicio: start, fin: end })),
  };
}
