import {
  useEffect,
  useId,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { useAnchoredPopover } from '@/shared/hooks/useAnchoredPopover';
import { maskTime, hoursOfDay, timeTextToValue } from '@/shared/lib/date-input';
import { Field } from './Field';
import { Icon } from './Icon';

type Props = {
  label: string;
  // "HH:mm" o "" si no hay hora.
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  hint?: ReactNode;
  error?: string;
  ref?: Ref<HTMLInputElement>;
  'data-testid'?: string;
};

const SUGGESTED = hoursOfDay(15);
const INITIAL_TIME = '08:00';

// Índice de la primera hora sugerida igual o posterior a `hora`.
const nearest = (time: string) => {
  const index = SUGGESTED.findIndex((suggested) => suggested >= time);
  return index === -1 ? SUGGESTED.length - 1 : index;
};

// Hora que se escribe como HH:mm (los dos puntos se ponen solos) o se elige de una lista cada 15
// minutos (combobox editable). Avisa el valor cuando la hora es válida y "" mientras no lo es.
export function TimeField({
  label,
  value,
  onChange,
  onBlur,
  hint,
  error,
  ref,
  'data-testid': testId,
}: Props) {
  const listId = useId();
  const popover = useAnchoredPopover<HTMLDivElement, HTMLUListElement>({ matchWidth: true });
  const [text, setText] = useState(value);
  const [notifiedValue, setNotifiedValue] = useState(value);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const optionId = (index: number) => `${listId}-hora-${index}`;

  // Si el valor cambia desde afuera, el texto lo sigue.
  if (value !== notifiedValue) {
    setNotifiedValue(value);
    if ((timeTextToValue(text) ?? '') !== value) setText(value);
  }

  useEffect(() => {
    if (!popover.open || active < 0) return;
    document.getElementById(`${listId}-hora-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [popover.open, active, listId]);

  const validate = (current: string) =>
    current.trim() === '' || timeTextToValue(current) ? null : 'Escribe la hora como HH:mm';

  const notify = (time: string) => {
    setNotifiedValue(time);
    if (time !== value) onChange(time);
  };

  const open = () => {
    setActive(nearest(timeTextToValue(text) ?? INITIAL_TIME));
    popover.show();
  };

  const write = (newValue: string) => {
    const masked = maskTime(newValue);
    const time = timeTextToValue(masked) ?? '';
    setText(masked);
    if (formatError && !validate(masked)) setFormatError(null);
    if (popover.open && time) setActive(nearest(time));
    notify(time);
  };

  const choose = (index: number) => {
    const time = SUGGESTED[index];
    if (!time) return;
    setText(time);
    setFormatError(null);
    notify(time);
    popover.hide();
  };

  const move = (step: number) => {
    if (!popover.open) {
      open();
      return;
    }
    setActive((current) => Math.min(Math.max(current + step, 0), SUGGESTED.length - 1));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        move(1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        move(-1);
        return;
      case 'Enter':
        // Con la lista abierta, Enter elige la hora en lugar de enviar el formulario.
        if (popover.open) {
          e.preventDefault();
          choose(active);
        }
        return;
      case 'Escape':
        if (popover.open) {
          e.preventDefault();
          e.stopPropagation();
          popover.hide();
        }
        return;
      case 'Tab':
        popover.hide();
    }
  };

  const onLeave = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && popover.anchorRef.current?.contains(next)) return;
    popover.hide();
    setFormatError(validate(text));
    const time = timeTextToValue(text);
    if (time) setText(time);
    onBlur?.();
  };

  return (
    <Field label={label} hint={hint} error={formatError ?? error}>
      {(control, labelId) => (
        <div className="input-group" ref={popover.anchorRef} onBlur={onLeave}>
          <input
            {...control}
            ref={ref}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="HH:mm"
            role="combobox"
            aria-autocomplete="none"
            aria-expanded={popover.open}
            aria-controls={listId}
            aria-activedescendant={popover.open && active >= 0 ? optionId(active) : undefined}
            value={text}
            onChange={(e) => write(e.target.value)}
            onKeyDown={onKeyDown}
            data-testid={testId}
          />
          <button
            type="button"
            className="input-group-button"
            tabIndex={-1}
            aria-label={`Ver horas para ${label.toLowerCase()}`}
            // El foco se queda en el campo de texto.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => (popover.open ? popover.hide() : open())}
          >
            <Icon name="clock" />
          </button>
          {popover.portal(
            <ul
              ref={popover.popoverRef}
              id={listId}
              role="listbox"
              aria-labelledby={labelId}
              className="popover listbox"
              onMouseDown={(e) => e.preventDefault()}
            >
              {SUGGESTED.map((time, index) => (
                <li
                  key={time}
                  id={optionId(index)}
                  role="option"
                  tabIndex={-1}
                  aria-selected={time === value}
                  className={index === active ? 'option option-active' : 'option'}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(index)}
                  onKeyDown={onKeyDown}
                >
                  <span>{time}</span>
                  {time === value && <Icon name="tick" />}
                </li>
              ))}
            </ul>,
          )}
        </div>
      )}
    </Field>
  );
}
