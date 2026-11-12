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
import { enmascararHora, horasDelDia, textoHoraAValor } from '@/shared/lib/date-input';
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

const SUGERIDAS = horasDelDia(15);
const HORA_INICIAL = '08:00';

// Índice de la primera hora sugerida igual o posterior a `hora`.
const cercana = (hora: string) => {
  const indice = SUGERIDAS.findIndex((sugerida) => sugerida >= hora);
  return indice === -1 ? SUGERIDAS.length - 1 : indice;
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
  const [texto, setTexto] = useState(value);
  const [valorAvisado, setValorAvisado] = useState(value);
  const [errorFormato, setErrorFormato] = useState<string | null>(null);
  const [activa, setActiva] = useState(-1);
  const idOpcion = (indice: number) => `${listId}-hora-${indice}`;

  // Si el valor cambia desde afuera, el texto lo sigue.
  if (value !== valorAvisado) {
    setValorAvisado(value);
    if ((textoHoraAValor(texto) ?? '') !== value) setTexto(value);
  }

  useEffect(() => {
    if (!popover.open || activa < 0) return;
    document.getElementById(`${listId}-hora-${activa}`)?.scrollIntoView({ block: 'nearest' });
  }, [popover.open, activa, listId]);

  const validar = (actual: string) =>
    actual.trim() === '' || textoHoraAValor(actual) ? null : 'Escribe la hora como HH:mm';

  const avisar = (hora: string) => {
    setValorAvisado(hora);
    if (hora !== value) onChange(hora);
  };

  const abrir = () => {
    setActiva(cercana(textoHoraAValor(texto) ?? HORA_INICIAL));
    popover.show();
  };

  const escribir = (nuevo: string) => {
    const enmascarado = enmascararHora(nuevo);
    const hora = textoHoraAValor(enmascarado) ?? '';
    setTexto(enmascarado);
    if (errorFormato && !validar(enmascarado)) setErrorFormato(null);
    if (popover.open && hora) setActiva(cercana(hora));
    avisar(hora);
  };

  const elegir = (indice: number) => {
    const hora = SUGERIDAS[indice];
    if (!hora) return;
    setTexto(hora);
    setErrorFormato(null);
    avisar(hora);
    popover.hide();
  };

  const mover = (paso: number) => {
    if (!popover.open) {
      abrir();
      return;
    }
    setActiva((actual) => Math.min(Math.max(actual + paso, 0), SUGERIDAS.length - 1));
  };

  const alPulsarTecla = (e: KeyboardEvent<HTMLElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        mover(1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        mover(-1);
        return;
      case 'Enter':
        // Con la lista abierta, Enter elige la hora en lugar de enviar el formulario.
        if (popover.open) {
          e.preventDefault();
          elegir(activa);
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

  const alSalir = (e: FocusEvent<HTMLDivElement>) => {
    const siguiente = e.relatedTarget as Node | null;
    if (siguiente && popover.anchorRef.current?.contains(siguiente)) return;
    popover.hide();
    setErrorFormato(validar(texto));
    const hora = textoHoraAValor(texto);
    if (hora) setTexto(hora);
    onBlur?.();
  };

  return (
    <Field label={label} hint={hint} error={errorFormato ?? error}>
      {(control, labelId) => (
        <div className="input-group" ref={popover.anchorRef} onBlur={alSalir}>
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
            aria-activedescendant={popover.open && activa >= 0 ? idOpcion(activa) : undefined}
            value={texto}
            onChange={(e) => escribir(e.target.value)}
            onKeyDown={alPulsarTecla}
            data-testid={testId}
          />
          <button
            type="button"
            className="input-group-button"
            tabIndex={-1}
            aria-label={`Ver horas para ${label.toLowerCase()}`}
            // El foco se queda en el campo de texto.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => (popover.open ? popover.hide() : abrir())}
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
              {SUGERIDAS.map((hora, indice) => (
                <li
                  key={hora}
                  id={idOpcion(indice)}
                  role="option"
                  tabIndex={-1}
                  aria-selected={hora === value}
                  className={indice === activa ? 'option option-active' : 'option'}
                  onMouseEnter={() => setActiva(indice)}
                  onClick={() => elegir(indice)}
                  onKeyDown={alPulsarTecla}
                >
                  <span>{hora}</span>
                  {hora === value && <Icon name="tick" />}
                </li>
              ))}
            </ul>,
          )}
        </div>
      )}
    </Field>
  );
}
