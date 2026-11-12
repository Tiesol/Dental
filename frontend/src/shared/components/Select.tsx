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
const PAUSA_BUSQUEDA_MS = 500;

const normalizar = (texto: string) =>
  texto
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
  const [activo, setActivo] = useState(-1);
  const busqueda = useRef({ texto: '', hasta: 0 });
  const elegido = options.findIndex((opcion) => opcion.value === value);
  const idOpcion = (indice: number) => `${listId}-opcion-${indice}`;

  useEffect(() => {
    if (!popover.open || activo < 0) return;
    document.getElementById(`${listId}-opcion-${activo}`)?.scrollIntoView({ block: 'nearest' });
  }, [popover.open, activo, listId]);

  const abrir = (indice: number) => {
    setActivo(indice);
    popover.show();
  };

  const mover = (indice: number) => {
    const destino = Math.min(Math.max(indice, 0), options.length - 1);
    if (popover.open) setActivo(destino);
    else abrir(destino);
  };

  const elegir = (indice: number) => {
    const opcion = options[indice];
    if (opcion && opcion.value !== value) onChange(opcion.value);
    popover.hide();
  };

  const buscar = (letra: string) => {
    const ahora = Date.now();
    const texto = ahora < busqueda.current.hasta ? busqueda.current.texto + letra : letra;
    busqueda.current = { texto, hasta: ahora + PAUSA_BUSQUEDA_MS };
    const objetivo = normalizar(texto);
    // La misma letra repetida pasa a la siguiente opción que empieza con ella.
    const desde = texto.length === 1 ? (popover.open ? activo : elegido) + 1 : 0;
    const orden = [...options.slice(desde), ...options.slice(0, desde)];
    const encontrada = orden.find((opcion) => normalizar(opcion.label).startsWith(objetivo));
    if (encontrada) mover(options.indexOf(encontrada));
  };

  const alPulsarTecla = (e: KeyboardEvent<HTMLElement>) => {
    const actual = popover.open ? activo : Math.max(elegido, 0);
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        mover(popover.open ? actual + 1 : actual);
        return;
      case 'ArrowUp':
        e.preventDefault();
        mover(popover.open ? actual - 1 : actual);
        return;
      case 'Home':
        e.preventDefault();
        mover(0);
        return;
      case 'End':
        e.preventDefault();
        mover(options.length - 1);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (e.key === ' ' && Date.now() < busqueda.current.hasta) buscar(' ');
        else if (popover.open) elegir(activo);
        else abrir(actual);
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
          buscar(e.key);
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
            aria-activedescendant={popover.open && activo >= 0 ? idOpcion(activo) : undefined}
            className="select-trigger"
            disabled={disabled}
            data-testid={testId}
            onClick={() => (popover.open ? popover.hide() : abrir(Math.max(elegido, 0)))}
            onKeyDown={alPulsarTecla}
            // La activación nativa del Espacio ocurre al soltar la tecla: ya se resolvió al pulsarla.
            onKeyUp={(e) => {
              if (e.key === ' ') e.preventDefault();
            }}
            onBlur={() => {
              popover.hide();
              onBlur?.();
            }}
          >
            <span className={elegido >= 0 ? 'select-value' : 'select-value select-placeholder'}>
              {elegido >= 0 ? options[elegido].label : placeholder}
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
              {options.map((opcion, indice) => (
                <li
                  key={String(opcion.value)}
                  id={idOpcion(indice)}
                  role="option"
                  tabIndex={-1}
                  aria-selected={indice === elegido}
                  className={indice === activo ? 'option option-active' : 'option'}
                  onMouseEnter={() => setActivo(indice)}
                  onClick={() => elegir(indice)}
                  onKeyDown={alPulsarTecla}
                >
                  <span>{opcion.label}</span>
                  {indice === elegido && <Icon name="tick" />}
                </li>
              ))}
            </ul>,
          )}
        </>
      )}
    </Field>
  );
}
