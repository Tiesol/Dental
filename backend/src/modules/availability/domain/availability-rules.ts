import { FechaInvalidaError, HorarioInvalidoError } from '../../../common/errors/domain-error';
import { AvailabilityRuleInput, BlockRange } from './availability';

const enteroEntre = (valor: number, min: number, max: number): boolean =>
  Number.isInteger(valor) && valor >= min && valor <= max;

function assertTramoValido({ diaSemana, minutoInicio, minutoFin }: AvailabilityRuleInput): void {
  if (!enteroEntre(diaSemana, 0, 6)) {
    throw new HorarioInvalidoError('El día de la semana debe estar entre 0 y 6');
  }
  if (!enteroEntre(minutoInicio, 0, 1440) || !enteroEntre(minutoFin, 0, 1440)) {
    throw new HorarioInvalidoError('Los minutos del horario deben estar entre 0 y 1440');
  }
  if (minutoInicio >= minutoFin) {
    throw new HorarioInvalidoError('El horario debe empezar antes de terminar');
  }
}

// Los tramos consecutivos son válidos porque los intervalos son semiabiertos: [540, 720) y
// [720, 900) no se solapan. Ya ordenados, si hay algún solapamiento lo hay entre dos vecinos.
function assertSinSolapamientos(horarios: AvailabilityRuleInput[]): void {
  const ordenados = [...horarios].sort(
    (a, b) => a.diaSemana - b.diaSemana || a.minutoInicio - b.minutoInicio,
  );
  for (let i = 1; i < ordenados.length; i++) {
    const anterior = ordenados[i - 1];
    const actual = ordenados[i];
    if (actual.diaSemana === anterior.diaSemana && actual.minutoInicio < anterior.minutoFin) {
      throw new HorarioInvalidoError('Los horarios de un mismo día no pueden solaparse');
    }
  }
}

export function assertHorariosValidos(horarios: AvailabilityRuleInput[]): void {
  horarios.forEach(assertTramoValido);
  assertSinSolapamientos(horarios);
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
