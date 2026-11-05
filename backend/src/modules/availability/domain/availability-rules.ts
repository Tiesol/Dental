import { FechaInvalidaError, HorarioInvalidoError } from '../../../common/errors/domain-error';
import { AvailabilityRuleInput, BlockRange } from './availability';

const entero = (valor: number, min: number, max: number): boolean =>
  Number.isInteger(valor) && valor >= min && valor <= max;

// Reglas de un conjunto de horarios antes de guardarlo. Los tramos consecutivos son válidos porque
// los intervalos son semiabiertos: [540, 720) y [720, 900) no se solapan.
export function assertHorariosValidos(horarios: AvailabilityRuleInput[]): void {
  for (const { diaSemana, minutoInicio, minutoFin } of horarios) {
    if (!entero(diaSemana, 0, 6)) {
      throw new HorarioInvalidoError('El día de la semana debe estar entre 0 y 6');
    }
    if (!entero(minutoInicio, 0, 1440) || !entero(minutoFin, 0, 1440)) {
      throw new HorarioInvalidoError('Los minutos del horario deben estar entre 0 y 1440');
    }
    if (minutoInicio >= minutoFin) {
      throw new HorarioInvalidoError('El horario debe empezar antes de terminar');
    }
  }

  // Ya ordenados, si hay algún solapamiento lo hay entre dos tramos vecinos.
  const ordenados = [...horarios].sort(
    (a, b) => a.diaSemana - b.diaSemana || a.minutoInicio - b.minutoInicio,
  );
  ordenados.slice(1).forEach((tramo, i) => {
    const anterior = ordenados[i];
    if (tramo.diaSemana === anterior.diaSemana && tramo.minutoInicio < anterior.minutoFin) {
      throw new HorarioInvalidoError('Los horarios de un mismo día no pueden solaparse');
    }
  });
}

// Un bloque ya empezado se acepta (una pausa que surge ahora); uno ya terminado no sirve de nada.
export function assertBloqueValido({ inicio, fin }: BlockRange, ahora: Date): void {
  if (inicio >= fin) {
    throw new FechaInvalidaError('El bloque debe terminar después de empezar');
  }
  if (fin <= ahora) {
    throw new FechaInvalidaError('El bloque ya terminó');
  }
}
