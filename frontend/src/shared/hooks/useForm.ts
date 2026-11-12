import { useState } from 'react';
import { useFieldErrors } from './useFieldErrors';

type Values = Record<string, string>;
type Name<V extends Values> = keyof V & string;

// Regla de un campo: recibe su valor y el resto, para validaciones cruzadas como la confirmación.
export type FormRule<V extends Values> = (value: string, values: V) => string | null;
export type FormRules<V extends Values> = Partial<Record<Name<V>, FormRule<V>>>;

// Estado y validación de un formulario de campos de texto. `field(nombre)` devuelve lo que necesitan
// TextField, TextArea, DateField o TimeField: valor, error, onChange, onBlur y ref. El orden de las
// claves de `initial` debe ser el del formulario: al enviar se enfoca el primer campo inválido.
export function useForm<V extends Values>(initial: V, rules: FormRules<V>) {
  const [values, setValues] = useState<V>(initial);
  const { errors, register, blur, revalidate, validateAll, clear } = useFieldErrors();
  const names = Object.keys(initial) as Name<V>[];

  const check = (name: Name<V>, all: V) => rules[name]?.(all[name], all) ?? null;

  const setValue = (name: Name<V>, value: string) => {
    const next: V = { ...values, [name]: value };
    setValues(next);
    revalidate(names.map((n) => [n, check(n, next)]));
  };

  const field = (name: Name<V>) => ({
    value: values[name],
    error: errors[name] as string | undefined,
    onChange: (value: string) => setValue(name, value),
    onBlur: () => blur(name, check(name, values)),
    ref: register(name),
  });

  const validate = () => validateAll(names.map((n) => [n, check(n, values)]));

  const reset = (next: V = initial) => {
    setValues(next);
    clear();
  };

  return { values, setValue, field, validate, reset };
}
