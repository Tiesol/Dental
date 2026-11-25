import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { useAnchoredPopover } from '@/shared/hooks/useAnchoredPopover';
import { mergeRefs } from '@/shared/lib/merge-refs';
import { Field } from './Field';
import { Icon } from './Icon';

export type SelectOption<V extends string | number> = { value: V; label: string };

type Props<V extends string | number> = {
  label: string;
  value: V;
  options: readonly SelectOption<V>[];
  onChange: (value: V) => void;
  onBlur?: () => void;
  // "field" en formularios; "filter" en las barras de filtros, donde crece y en móvil ocupa el ancho.
  variant?: 'field' | 'filter';
  placeholder?: string;
  hint?: ReactNode;
  error?: string;
  disabled?: boolean;
  ref?: Ref<HTMLButtonElement>;
  'data-testid'?: string;
};

// Las letras escritas con menos de este intervalo se juntan en una sola búsqueda.
const SEARCH_PAUSE_MS = 500;

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

// Desplegable propio (patrón combobox de solo selección): el foco queda en el disparador y la lista
// se recorre con aria-activedescendant. Flechas, Inicio/Fin, Enter/Espacio, Escape y búsqueda por
// tipeo. Se cierra con clic afuera, Escape o al perder el foco.
export function Select<V extends string | number>({
  label,
  value,
  options,
  onChange,
  onBlur,
  variant = 'field',
  placeholder = 'Elige una opción',
  hint,
  error,
  disabled,
  ref,
  'data-testid': testId,
}: Props<V>) {
  const listId = useId();
  const popover = useAnchoredPopover<HTMLButtonElement, HTMLUListElement>({ matchWidth: true });
  const [active, setActive] = useState(-1);
  const query = useRef({ text: '', until: 0 });
  const chosen = options.findIndex((option) => option.value === value);
  const optionId = (index: number) => `${listId}-opcion-${index}`;

  useEffect(() => {
    if (!popover.open || active < 0) return;
    document.getElementById(`${listId}-opcion-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [popover.open, active, listId]);

  const open = (index: number) => {
    setActive(index);
    popover.show();
  };

  const move = (index: number) => {
    const target = Math.min(Math.max(index, 0), options.length - 1);
    if (popover.open) setActive(target);
    else open(target);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (option && option.value !== value) onChange(option.value);
    popover.hide();
  };

  const search = (letter: string) => {
    const now = Date.now();
    const text = now < query.current.until ? query.current.text + letter : letter;
    query.current = { text, until: now + SEARCH_PAUSE_MS };
    const targetIndex = normalize(text);
    // La misma letra repetida pasa a la siguiente opción que empieza con ella.
    const from = text.length === 1 ? (popover.open ? active : chosen) + 1 : 0;
    const order = [...options.slice(from), ...options.slice(0, from)];
    const found = order.find((option) => normalize(option.label).startsWith(targetIndex));
    if (found) move(options.indexOf(found));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const current = popover.open ? active : Math.max(chosen, 0);
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        move(popover.open ? current + 1 : current);
        return;
      case 'ArrowUp':
        e.preventDefault();
        move(popover.open ? current - 1 : current);
        return;
      case 'Home':
        e.preventDefault();
        move(0);
        return;
      case 'End':
        e.preventDefault();
        move(options.length - 1);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (e.key === ' ' && Date.now() < query.current.until) search(' ');
        else if (popover.open) choose(active);
        else open(current);
        return;
      case 'Escape':
        // Sin propagar: un Escape que cierra la lista no debe cerrar también un diálogo padre.
        if (popover.open) {
          e.preventDefault();
          e.stopPropagation();
          popover.hide();
        }
        return;
      case 'Tab':
        popover.hide();
        return;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          search(e.key);
        }
    }
  };

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      className={variant === 'filter' ? 'field-filter' : undefined}
    >
      {(control, labelId) => (
        <>
          <button
            {...control}
            ref={mergeRefs(popover.anchorRef, ref)}
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={popover.open}
            aria-controls={listId}
            aria-activedescendant={popover.open && active >= 0 ? optionId(active) : undefined}
            className="select-trigger"
            disabled={disabled}
            data-testid={testId}
            onClick={() => (popover.open ? popover.hide() : open(Math.max(chosen, 0)))}
            onKeyDown={onKeyDown}
            // La activación nativa del Espacio ocurre al soltar la tecla: ya se resolvió al pulsarla.
            onKeyUp={(e) => {
              if (e.key === ' ') e.preventDefault();
            }}
            onBlur={() => {
              popover.hide();
              onBlur?.();
            }}
          >
            <span className={chosen >= 0 ? 'select-value' : 'select-value select-placeholder'}>
              {chosen >= 0 ? options[chosen].label : placeholder}
            </span>
            <Icon name="chevron-down" />
          </button>
          {popover.portal(
            <ul
              ref={popover.popoverRef}
              id={listId}
              role="listbox"
              aria-labelledby={labelId}
              className="popover listbox"
              // El foco no sale del disparador al elegir con el mouse.
              onMouseDown={(e) => e.preventDefault()}
            >
              {options.map((option, index) => (
                <li
                  key={String(option.value)}
                  id={optionId(index)}
                  role="option"
                  tabIndex={-1}
                  aria-selected={index === chosen}
                  className={index === active ? 'option option-active' : 'option'}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(index)}
                  onKeyDown={onKeyDown}
                >
                  <span>{option.label}</span>
                  {index === chosen && <Icon name="tick" />}
                </li>
              ))}
            </ul>,
          )}
        </>
      )}
    </Field>
  );
}
