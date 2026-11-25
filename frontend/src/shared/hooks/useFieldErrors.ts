import { useCallback, useRef, useState } from 'react';

// Resultado de validar un campo: su nombre y el mensaje de error, o null si es válido.
export type FieldCheck = [name: string, error: string | null];

function apply(errors: Record<string, string>, name: string, error: string | null) {
  if (error) return errors[name] === error ? errors : { ...errors, [name]: error };
  if (!(name in errors)) return errors;
  const { [name]: _removed, ...rest } = errors;
  return rest;
}

// Núcleo de la validación de formularios (DISENO.md, "Formularios"): cada campo valida al salir de
// él; al escribir solo se limpia el error que ya se mostraba, en cuanto el valor queda válido; al
// enviar se valida todo y se enfoca el primer campo inválido. Lo usan useForm y los formularios con
// filas dinámicas.
export function useFieldErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const elements = useRef(new Map<string, HTMLElement>());

  // Ref del control de cada campo, para poder enfocarlo al enviar.
  const register = useCallback(
    (name: string) => (element: HTMLElement | null) => {
      if (element) elements.current.set(name, element);
      else elements.current.delete(name);
    },
    [],
  );

  const blur = useCallback((name: string, error: string | null) => {
    setErrors((currentErrors) => apply(currentErrors, name, error));
  }, []);

  const revalidate = useCallback((checks: FieldCheck[]) => {
    setErrors((currentErrors) =>
      checks.reduce(
        (nextErrors, [name, error]) =>
          currentErrors[name] && !error ? apply(nextErrors, name, null) : nextErrors,
        currentErrors,
      ),
    );
  }, []);

  // Los checks van en el orden del formulario: se enfoca el primero que falle.
  const validateAll = useCallback((checks: FieldCheck[]): boolean => {
    const nextErrors: Record<string, string> = {};
    for (const [name, error] of checks) if (error) nextErrors[name] = error;
    setErrors(nextErrors);
    const first = checks.find(([, error]) => error !== null);
    if (first) elements.current.get(first[0])?.focus();
    return !first;
  }, []);

  const clear = useCallback((names?: string[]) => {
    setErrors((currentErrors) =>
      names ? names.reduce((rest, name) => apply(rest, name, null), currentErrors) : {},
    );
  }, []);

  return { errors, register, blur, revalidate, validateAll, clear };
}
