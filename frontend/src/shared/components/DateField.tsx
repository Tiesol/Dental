import {
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { useAnchoredPopover } from '@/shared/hooks/useAnchoredPopover';
import { enmascararFecha, isoATextoFecha, textoFechaAIso } from '@/shared/lib/date-input';
import { mergeRefs } from '@/shared/lib/merge-refs';
import { Calendar } from './Calendar';
import { Field } from './Field';
import { Icon } from './Icon';

type Props = {
  label: string;
  // "yyyy-MM-dd" o "" si no hay fecha.
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  min?: string;
  // Permite quitar la fecha desde el calendario (filtros opcionales).
  clearable?: boolean;
  hint?: ReactNode;
  error?: string;
  fieldClassName?: string;
  ref?: Ref<HTMLInputElement>;
  'data-testid'?: string;
};

// Fecha que se escribe como dd/mm/aaaa (las barras se ponen solas) o se elige en un calendario.
// Avisa el valor en cuanto la fecha está completa; mientras está incompleta o es inválida avisa "".
// El formato y el mínimo se validan al salir del campo, como el resto de los formularios.
export function DateField({
  label,
  value,
  onChange,
  onBlur,
  min,
  clearable = false,
  hint,
  error,
  fieldClassName,
  ref,
  'data-testid': testId,
}: Props) {
  const popover = useAnchoredPopover<HTMLDivElement, HTMLDivElement>();
  const inputRef = useRef<HTMLInputElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const [texto, setTexto] = useState(() => isoATextoFecha(value));
  const [valorAvisado, setValorAvisado] = useState(value);
  const [errorFormato, setErrorFormato] = useState<string | null>(null);

  // Si el valor cambia desde afuera (p. ej. se vació el formulario), el texto lo sigue.
  if (value !== valorAvisado) {
    setValorAvisado(value);
    if ((textoFechaAIso(texto) ?? '') !== value) setTexto(isoATextoFecha(value));
  }

  const validar = (actual: string): string | null => {
    if (actual.trim() === '') return null;
    const iso = textoFechaAIso(actual);
    if (!iso) return 'Escribe la fecha como dd/mm/aaaa';
    if (min && iso < min) return `Elige una fecha desde el ${isoATextoFecha(min)}`;
    return null;
  };

  const avisar = (iso: string) => {
    setValorAvisado(iso);
    if (iso !== value) onChange(iso);
  };

  const escribir = (nuevo: string) => {
    const enmascarado = enmascararFecha(nuevo);
    setTexto(enmascarado);
    if (errorFormato && !validar(enmascarado)) setErrorFormato(null);
    avisar(textoFechaAIso(enmascarado) ?? '');
  };

  const elegir = (iso: string) => {
    setTexto(isoATextoFecha(iso));
    setErrorFormato(null);
    avisar(iso);
    inputRef.current?.focus();
    popover.hide();
  };

  const borrar = () => {
    setTexto('');
    setErrorFormato(null);
    avisar('');
    inputRef.current?.focus();
    popover.hide();
  };

  // El campo incluye el calendario: solo se valida cuando el foco sale de los dos.
  const alSalir = (e: FocusEvent<HTMLDivElement>) => {
    const siguiente = e.relatedTarget as Node | null;
    if (
      siguiente &&
      (popover.anchorRef.current?.contains(siguiente) ||
        popover.popoverRef.current?.contains(siguiente))
    ) {
      return;
    }
    popover.hide();
    setErrorFormato(validar(texto));
    const iso = textoFechaAIso(texto);
    if (iso) setTexto(isoATextoFecha(iso));
    onBlur?.();
  };

  const alPulsarEnCampo = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && e.altKey) {
      e.preventDefault();
      popover.show();
    }
  };

  const cerrarCalendario = () => {
    botonRef.current?.focus();
    popover.hide();
  };

  return (
    <Field label={label} hint={hint} error={errorFormato ?? error} className={fieldClassName}>
      {(control) => (
        <div className="input-group" ref={popover.anchorRef} onBlur={alSalir}>
          <input
            {...control}
            ref={mergeRefs(inputRef, ref)}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="dd/mm/aaaa"
            value={texto}
            onChange={(e) => escribir(e.target.value)}
            onKeyDown={alPulsarEnCampo}
            data-testid={testId}
          />
          <button
            ref={botonRef}
            type="button"
            className="input-group-button"
            aria-label={`Elegir ${label.toLowerCase()} en el calendario`}
            aria-haspopup="dialog"
            aria-expanded={popover.open}
            onClick={() => (popover.open ? popover.hide() : popover.show())}
          >
            <Icon name="calendar" />
          </button>
          {popover.portal(
            <div
              ref={popover.popoverRef}
              className="popover popover-calendar"
              role="dialog"
              aria-label={`Calendario de ${label.toLowerCase()}`}
            >
              <Calendar
                value={value}
                min={min}
                clearable={clearable}
                onSelect={elegir}
                onClear={borrar}
                onEscape={cerrarCalendario}
              />
            </div>,
          )}
        </div>
      )}
    </Field>
  );
}
