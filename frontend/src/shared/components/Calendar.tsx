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
import { hoyEnClinica } from '@/shared/lib/dates';
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

const DIAS_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const SEMANA = { weekStartsOn: 1 } as const;

const aIso = (dia: Date) => format(dia, 'yyyy-MM-dd');
const desdeIso = (iso: string) => {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
};

// Mes en grilla con navegación por teclado (patrón de selector de fecha): flechas por día y semana,
// Inicio/Fin de la semana, RePág/AvPág por mes, Escape cierra. Los días anteriores a `min` se ven
// pero no se eligen.
export function Calendar({ value, min, clearable = false, onSelect, onClear, onEscape }: Props) {
  const tituloId = useId();
  const hoy = hoyEnClinica();
  const [enfocado, setEnfocado] = useState(() => desdeIso(value || (min && min > hoy ? min : hoy)));
  const grilla = useRef<HTMLTableElement>(null);
  // Solo se mueve el foco al abrir y con el teclado: los botones de mes lo dejan donde está.
  const debeEnfocar = useRef(true);

  useEffect(() => {
    if (!debeEnfocar.current) return;
    debeEnfocar.current = false;
    grilla.current?.querySelector<HTMLButtonElement>(`[data-dia="${aIso(enfocado)}"]`)?.focus();
  }, [enfocado]);

  const mes = startOfMonth(enfocado);
  const semanas: Date[][] = [];
  for (
    let dia = startOfWeek(mes, SEMANA);
    dia <= endOfWeek(endOfMonth(mes), SEMANA);
    dia = addDays(dia, 1)
  ) {
    if (semanas.length === 0 || semanas[semanas.length - 1].length === 7) semanas.push([]);
    semanas[semanas.length - 1].push(dia);
  }

  const irA = (dia: Date) => {
    debeEnfocar.current = true;
    setEnfocado(dia);
  };

  // Sin propagar: un Escape que cierra el calendario no debe cerrar también un diálogo padre.
  const cerrarConEscape = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'Escape') return false;
    e.preventDefault();
    e.stopPropagation();
    onEscape();
    return true;
  };

  const alPulsarTecla = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (cerrarConEscape(e)) return;
    const destinos: Record<string, () => Date> = {
      ArrowLeft: () => addDays(enfocado, -1),
      ArrowRight: () => addDays(enfocado, 1),
      ArrowUp: () => addDays(enfocado, -7),
      ArrowDown: () => addDays(enfocado, 7),
      Home: () => startOfWeek(enfocado, SEMANA),
      End: () => endOfWeek(enfocado, SEMANA),
      PageUp: () => addMonths(enfocado, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(enfocado, e.shiftKey ? 12 : 1),
    };
    const destino = destinos[e.key];
    if (!destino) return;
    e.preventDefault();
    irA(destino());
  };

  const anteriorAlMinimo = (iso: string) => Boolean(min && iso < min);

  return (
    <div className="calendar">
      <div className="calendar-header">
        <Button
          variant="ghost"
          aria-label="Mes anterior"
          onKeyDown={cerrarConEscape}
          onClick={() => setEnfocado(addMonths(enfocado, -1))}
        >
          <Icon name="chevron-left" />
        </Button>
        <p id={tituloId} className="calendar-title" aria-live="polite">
          {format(mes, "MMMM 'de' yyyy", { locale: es })}
        </p>
        <Button
          variant="ghost"
          aria-label="Mes siguiente"
          onKeyDown={cerrarConEscape}
          onClick={() => setEnfocado(addMonths(enfocado, 1))}
        >
          <Icon name="chevron-right" />
        </Button>
      </div>
      <table ref={grilla} role="grid" aria-labelledby={tituloId} className="calendar-grid">
        <thead>
          <tr>
            {DIAS_SEMANA.map((dia) => (
              <th key={dia} scope="col" abbr={dia}>
                {dia === 'miércoles' ? 'X' : dia[0].toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.map((semana) => (
            <tr key={aIso(semana[0])}>
              {semana.map((dia) => {
                const iso = aIso(dia);
                const bloqueado = anteriorAlMinimo(iso);
                const clases = [
                  'calendar-day',
                  isSameMonth(dia, mes) ? null : 'calendar-day-outside',
                  iso === value ? 'calendar-day-selected' : null,
                  iso === hoy ? 'calendar-day-today' : null,
                ];
                return (
                  <td key={iso}>
                    <button
                      type="button"
                      className={clases.filter(Boolean).join(' ')}
                      data-dia={iso}
                      tabIndex={iso === aIso(enfocado) ? 0 : -1}
                      aria-label={format(dia, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
                      aria-pressed={iso === value}
                      aria-current={iso === hoy ? 'date' : undefined}
                      aria-disabled={bloqueado || undefined}
                      onClick={() => {
                        if (!bloqueado) onSelect(iso);
                      }}
                      onKeyDown={alPulsarTecla}
                    >
                      {format(dia, 'd')}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="calendar-footer">
        {!anteriorAlMinimo(hoy) && (
          <Button variant="ghost" onKeyDown={cerrarConEscape} onClick={() => onSelect(hoy)}>
            Hoy
          </Button>
        )}
        {clearable && (
          <Button variant="ghost" onKeyDown={cerrarConEscape} onClick={onClear}>
            Borrar fecha
          </Button>
        )}
      </div>
    </div>
  );
}
