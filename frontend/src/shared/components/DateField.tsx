import {
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { useAnchoredPopover } from '@/shared/hooks/useAnchoredPopover';
import { maskDate, isoToDateText, dateTextToIso } from '@/shared/lib/date-input';
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
// Avisa el valor en cuanto la fecha está completa y cumple `min`; mientras está incompleta, es
// inválida o queda antes de `min` avisa "". El formato y el mínimo se validan al salir del campo,
// como el resto de los formularios.
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [text, setText] = useState(() => isoToDateText(value));
  const [notifiedValue, setNotifiedValue] = useState(value);
  const [formatError, setFormatError] = useState<string | null>(null);

  // Si el valor cambia desde afuera (p. ej. se vació el formulario), el texto lo sigue.
  if (value !== notifiedValue) {
    setNotifiedValue(value);
    if ((dateTextToIso(text) ?? '') !== value) setText(isoToDateText(value));
  }

  const validate = (current: string): string | null => {
    if (current.trim() === '') return null;
    const iso = dateTextToIso(current);
    if (!iso) return 'Escribe la fecha como dd/mm/aaaa';
    if (min && iso < min) return `Elige una fecha desde el ${isoToDateText(min)}`;
    return null;
  };

  const notify = (iso: string) => {
    setNotifiedValue(iso);
    if (iso !== value) onChange(iso);
  };

  const write = (newValue: string) => {
    const masked = maskDate(newValue);
    setText(masked);
    if (formatError && !validate(masked)) setFormatError(null);
    const iso = dateTextToIso(masked);
    notify(iso && (!min || iso >= min) ? iso : '');
  };

  const choose = (iso: string) => {
    setText(isoToDateText(iso));
    setFormatError(null);
    notify(iso);
    inputRef.current?.focus();
    popover.hide();
  };

  const clear = () => {
    setText('');
    setFormatError(null);
    notify('');
    inputRef.current?.focus();
    popover.hide();
  };

  // El campo incluye el calendario: solo se valida cuando el foco sale de los dos.
  const onLeave = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (
      next &&
      (popover.anchorRef.current?.contains(next) || popover.popoverRef.current?.contains(next))
    ) {
      return;
    }
    popover.hide();
    setFormatError(validate(text));
    const iso = dateTextToIso(text);
    if (iso) setText(isoToDateText(iso));
    onBlur?.();
  };

  const onFieldPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && e.altKey) {
      e.preventDefault();
      popover.show();
    }
  };

  const closeCalendar = () => {
    buttonRef.current?.focus();
    popover.hide();
  };

  return (
    <Field label={label} hint={hint} error={formatError ?? error} className={fieldClassName}>
      {(control) => (
        <div className="input-group" ref={popover.anchorRef} onBlur={onLeave}>
          <input
            {...control}
            ref={mergeRefs(inputRef, ref)}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="dd/mm/aaaa"
            value={text}
            onChange={(e) => write(e.target.value)}
            onKeyDown={onFieldPress}
            data-testid={testId}
          />
          <button
            ref={buttonRef}
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
                onSelect={choose}
                onClear={clear}
                onEscape={closeCalendar}
              />
            </div>,
          )}
        </div>
      )}
    </Field>
  );
}
