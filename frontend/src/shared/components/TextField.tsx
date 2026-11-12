import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import { Field } from './Field';

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'id' | 'aria-invalid' | 'aria-describedby'
> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  fieldClassName?: string;
  ref?: Ref<HTMLInputElement>;
};

// Campo de texto con etiqueta, ayuda y error. Se usa con `{...form.field('nombre')}` de useForm.
export function TextField({ label, hint, error, value, onChange, fieldClassName, ...rest }: Props) {
  return (
    <Field label={label} hint={hint} error={error} className={fieldClassName}>
      {(control) => (
        <input {...rest} {...control} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}
