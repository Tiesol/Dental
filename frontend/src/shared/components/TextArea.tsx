import type { ReactNode, Ref, TextareaHTMLAttributes } from 'react';
import { Field } from './Field';

type Props = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange' | 'id' | 'aria-invalid' | 'aria-describedby'
> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  ref?: Ref<HTMLTextAreaElement>;
};

// Texto largo con etiqueta, ayuda y error. Se usa con `{...form.field('descripcion')}` de useForm.
export function TextArea({ label, hint, error, value, onChange, ...rest }: Props) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(control) => (
        <textarea {...rest} {...control} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}
