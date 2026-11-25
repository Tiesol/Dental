import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { todayInClinic } from '@/shared/lib/dates';
import { Button } from './Button';
import { Icon } from './Icon';

type Props = {
  value: string;
  min?: string;
  clearable?: boolean;
  onSelect: (iso: string) => void;
  onClear: () => void;
  onEscape: () => void;
};

const WEEKDAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const WEEK = { weekStartsOn: 1 } as const;

const aIso = (day: Date) => format(day, 'yyyy-MM-dd');
const fromIso = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Mes en grilla con navegación por teclado (patrón de selector de fecha): flechas por día y semana,
// Inicio/Fin de la semana, RePág/AvPág por mes, Escape cierra. Los días anteriores a `min` se ven
// pero no se eligen.
export function Calendar({ value, min, clearable = false, onSelect, onClear, onEscape }: Props) {
  const titleId = useId();
  const today = todayInClinic();
  const [focused, setFocused] = useState(() =>
    fromIso(value || (min && min > today ? min : today)),
  );
  const grid = useRef<HTMLTableElement>(null);
  // Solo se mueve el foco al abrir y con el teclado: los botones de mes lo dejan donde está.
  const shouldFocus = useRef(true);

  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-dia="${aIso(focused)}"]`)?.focus();
  }, [focused]);

  const month = startOfMonth(focused);
  const weeks: Date[][] = [];
  for (
    let day = startOfWeek(month, WEEK);
    day <= endOfWeek(endOfMonth(month), WEEK);
    day = addDays(day, 1)
  ) {
    if (weeks.length === 0 || weeks[weeks.length - 1].length === 7) weeks.push([]);
    weeks[weeks.length - 1].push(day);
  }

  const goTo = (day: Date) => {
    shouldFocus.current = true;
    setFocused(day);
  };

  // Sin propagar: un Escape que cierra el calendario no debe cerrar también un diálogo padre.
  const closeOnEscape = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'Escape') return false;
    e.preventDefault();
    e.stopPropagation();
    onEscape();
    return true;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (closeOnEscape(e)) return;
    const targets: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => startOfWeek(focused, WEEK),
      End: () => endOfWeek(focused, WEEK),
      PageUp: () => addMonths(focused, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, e.shiftKey ? 12 : 1),
    };
    const target = targets[e.key];
    if (!target) return;
    e.preventDefault();
    goTo(target());
  };

  const beforeMinimum = (iso: string) => Boolean(min && iso < min);

  return (
    <div className="calendar">
      <div className="calendar-header">
        <Button
          variant="ghost"
          aria-label="Mes anterior"
          onKeyDown={closeOnEscape}
          onClick={() => setFocused(addMonths(focused, -1))}
        >
          <Icon name="chevron-left" />
        </Button>
        <p id={titleId} className="calendar-title" aria-live="polite">
          {format(month, "MMMM 'de' yyyy", { locale: es })}
        </p>
        <Button
          variant="ghost"
          aria-label="Mes siguiente"
          onKeyDown={closeOnEscape}
          onClick={() => setFocused(addMonths(focused, 1))}
        >
          <Icon name="chevron-right" />
        </Button>
      </div>
      <table ref={grid} role="grid" aria-labelledby={titleId} className="calendar-grid">
        <thead>
          <tr>
            {WEEKDAY_NAMES.map((day) => (
              <th key={day} scope="col" abbr={day}>
                {day === 'miércoles' ? 'X' : day[0].toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={aIso(week[0])}>
              {week.map((day) => {
                const iso = aIso(day);
                const blocked = beforeMinimum(iso);
                const classes = [
                  'calendar-day',
                  isSameMonth(day, month) ? null : 'calendar-day-outside',
                  iso === value ? 'calendar-day-selected' : null,
                  iso === today ? 'calendar-day-today' : null,
                ];
                return (
                  <td key={iso}>
                    <button
                      type="button"
                      className={classes.filter(Boolean).join(' ')}
                      data-dia={iso}
                      tabIndex={iso === aIso(focused) ? 0 : -1}
                      aria-label={format(day, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
                      aria-pressed={iso === value}
                      aria-current={iso === today ? 'date' : undefined}
                      aria-disabled={blocked || undefined}
                      onClick={() => {
                        if (!blocked) onSelect(iso);
                      }}
                      onKeyDown={onKeyDown}
                    >
                      {format(day, 'd')}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="calendar-footer">
        {!beforeMinimum(today) && (
          <Button variant="ghost" onKeyDown={closeOnEscape} onClick={() => onSelect(today)}>
            Hoy
          </Button>
        )}
        {clearable && (
          <Button variant="ghost" onKeyDown={closeOnEscape} onClick={onClear}>
            Borrar fecha
          </Button>
        )}
      </div>
    </div>
  );
}
