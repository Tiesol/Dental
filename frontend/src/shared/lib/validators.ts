// Validadores de campos para useForm. Devuelven el mensaje de error o null si el valor es válido.
export type Validator = (value: string) => string | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const required =
  (message: string): Validator =>
  (value) =>
    value.trim() === '' ? message : null;

export const email =
  (message = 'El email no es válido'): Validator =>
  (value) =>
    value.trim() === '' || EMAIL.test(value.trim()) ? null : message;

export const minLength =
  (min: number, message: string): Validator =>
  (value) =>
    value !== '' && value.length < min ? message : null;

export const maxLength =
  (max: number, message: string): Validator =>
  (value) =>
    value.length > max ? message : null;

// Aplica los validadores en orden y devuelve el primer error.
export function combine(...validators: Validator[]): Validator {
  return (value) => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) return error;
    }
    return null;
  };
}
