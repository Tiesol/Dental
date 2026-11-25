import { useState, type FormEvent } from 'react';
import type { AvailabilityRuleRequest, AvailabilityRuleResponse } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { Select, type SelectOption } from '@/shared/components/Select';
import { TimeField } from '@/shared/components/TimeField';
import { useFieldErrors, type FieldCheck } from '@/shared/hooks/useFieldErrors';
import { timeToMinutes, minutesToTime } from '@/shared/lib/dates';
import { useAction } from '../hooks/useAction';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_OPTIONS: SelectOption<number>[] = DAYS.map((day, value) => ({
  value,
  label: day,
}));

type TimeRange = { key: number; diaSemana: number; from: string; until: string };
type TimeKey = 'from' | 'until';

const fieldName = (timeRange: TimeRange, field: TimeKey) => `${timeRange.key}-${field}`;

const errorOf = (timeRange: TimeRange, field: TimeKey): string | null => {
  if (field === 'from') return timeRange.from ? null : 'Elige la hora de inicio';
  if (!timeRange.until) return 'Elige la hora de fin';
  return timeRange.from && timeRange.until <= timeRange.from
    ? 'Debe ser posterior a la de inicio'
    : null;
};

const checkboxesOf = (timeRange: TimeRange): FieldCheck[] => [
  [fieldName(timeRange, 'from'), errorOf(timeRange, 'from')],
  [fieldName(timeRange, 'until'), errorOf(timeRange, 'until')],
];

type Props = {
  schedule: AvailabilityRuleResponse[];
  save: (schedule: AvailabilityRuleRequest[]) => Promise<void>;
};

// Edita la lista completa de tramos: guardar reemplaza todos los horarios del odontólogo.
// Un horario partido son dos tramos del mismo día. El backend vuelve a validar las reglas.
export function FormHorarios({ schedule, save }: Props) {
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>(() =>
    schedule.map((h, key) => ({
      key,
      diaSemana: h.diaSemana,
      from: minutesToTime(h.minutoInicio),
      until: minutesToTime(h.minutoFin),
    })),
  );
  const [nextKey, setNextKey] = useState(schedule.length);
  const { sending, run, messages } = useAction();
  const errors = useFieldErrors();

  const change = (key: number, changes: Partial<TimeRange>) => {
    const updated = timeRanges.map((t) => (t.key === key ? { ...t, ...changes } : t));
    setTimeRanges(updated);
    const timeRange = updated.find((t) => t.key === key);
    if (timeRange) errors.revalidate(checkboxesOf(timeRange));
  };

  const add = () => {
    setTimeRanges((currentErrors) => [
      ...currentErrors,
      { key: nextKey, diaSemana: 1, from: '09:00', until: '12:00' },
    ]);
    setNextKey((key) => key + 1);
  };

  const remove = (timeRange: TimeRange) => {
    setTimeRanges((currentErrors) => currentErrors.filter((t) => t.key !== timeRange.key));
    errors.clear([fieldName(timeRange, 'from'), fieldName(timeRange, 'until')]);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!errors.validateAll(timeRanges.flatMap(checkboxesOf))) return;
    await run(
      () =>
        save(
          timeRanges.map((t) => ({
            diaSemana: t.diaSemana,
            minutoInicio: timeToMinutes(t.from),
            minutoFin: timeToMinutes(t.until),
          })),
        ),
      'Horarios guardados',
    );
  };

  const timeField = (timeRange: TimeRange, field: TimeKey, label: string) => {
    const name = fieldName(timeRange, field);
    return (
      <TimeField
        label={label}
        value={timeRange[field]}
        onChange={(value) =>
          change(timeRange.key, field === 'from' ? { from: value } : { until: value })
        }
        onBlur={() => errors.blur(name, errorOf(timeRange, field))}
        error={errors.errors[name]}
        ref={errors.register(name)}
      />
    );
  };

  return (
    <form className="card" onSubmit={onSubmit} aria-labelledby="titulo-horarios" noValidate>
      <div className="card-section">
        <h2 id="titulo-horarios">Horarios de atención</h2>
        <p className="muted">
          Para un horario partido, agrega dos tramos el mismo día. Las citas ya creadas fuera del
          horario nuevo se conservan.
        </p>
      </div>
      {timeRanges.length === 0 && <p className="muted">Todavía no tiene horarios de atención</p>}
      {timeRanges.map((timeRange, index) => (
        <div
          className="tramo"
          key={timeRange.key}
          role="group"
          aria-label={`Tramo ${index + 1}`}
          data-testid={`tramo-${index}`}
        >
          <Select
            label="Día"
            value={timeRange.diaSemana}
            options={DAY_OPTIONS}
            onChange={(weekday) => change(timeRange.key, { diaSemana: weekday })}
          />
          {timeField(timeRange, 'from', 'Desde')}
          {timeField(timeRange, 'until', 'Hasta')}
          <Button
            variant="danger-outline"
            aria-label={`Quitar tramo ${index + 1}`}
            onClick={() => remove(timeRange)}
          >
            Quitar
          </Button>
        </div>
      ))}
      {messages}
      <div className="form-actions">
        <Button variant="secondary" onClick={add}>
          Agregar tramo
        </Button>
        <Button type="submit" loading={sending} data-testid="btn-guardar-horarios">
          Guardar horarios
        </Button>
      </div>
    </form>
  );
}
