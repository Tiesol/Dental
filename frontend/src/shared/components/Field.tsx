import { useId, type ReactNode } from 'react';
import { Icon } from './Icon';

// Atributos que el control del campo debe llevar para quedar asociado a su etiqueta, ayuda y error.
export type FieldControlProps = {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
};

type Props = {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: (control: FieldControlProps, labelId: string) => ReactNode;
};

// Estructura común de un campo: etiqueta visible, control, ayuda y error debajo del control.
export function Field({ label, hint, error, className, children }: Props) {
  const id = useId();
  const labelId = `${id}-etiqueta`;
  const hintId = `${id}-ayuda`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={className ? `field ${className}` : 'field'}>
      <label className="field-label" id={labelId} htmlFor={id}>
        {label}
      </label>
      {children(
        {
          id,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': describedBy || undefined,
        },
        labelId,
      )}
      {hint && (
        <small id={hintId} className="field-hint">
          {hint}
        </small>
      )}
      {error && (
        <small id={errorId} className="field-error">
          <Icon name="alert" />
          {error}
        </small>
      )}
    </div>
  );
}
