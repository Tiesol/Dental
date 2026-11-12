import { useCallback, useRef, useState } from 'react';

// Resultado de validar un campo: su nombre y el mensaje de error, o null si es válido.
export type FieldCheck = [name: string, error: string | null];

function aplicar(errores: Record<string, string>, nombre: string, error: string | null) {
  if (error) return errores[nombre] === error ? errores : { ...errores, [nombre]: error };
  if (!(nombre in errores)) return errores;
  const { [nombre]: _quitado, ...resto } = errores;
  return resto;
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
    (nombre: string) => (elemento: HTMLElement | null) => {
      if (elemento) elements.current.set(nombre, elemento);
      else elements.current.delete(nombre);
    },
    [],
  );

  const blur = useCallback((nombre: string, error: string | null) => {
    setErrors((actuales) => aplicar(actuales, nombre, error));
  }, []);

  const revalidate = useCallback((checks: FieldCheck[]) => {
    setErrors((actuales) =>
      checks.reduce(
        (siguientes, [nombre, error]) =>
          actuales[nombre] && !error ? aplicar(siguientes, nombre, null) : siguientes,
        actuales,
      ),
    );
  }, []);

  // Los checks van en el orden del formulario: se enfoca el primero que falle.
  const validateAll = useCallback((checks: FieldCheck[]): boolean => {
    const siguientes: Record<string, string> = {};
    for (const [nombre, error] of checks) if (error) siguientes[nombre] = error;
    setErrors(siguientes);
    const primero = checks.find(([, error]) => error !== null);
    if (primero) elements.current.get(primero[0])?.focus();
    return !primero;
  }, []);

  const clear = useCallback((nombres?: string[]) => {
    setErrors((actuales) =>
      nombres ? nombres.reduce((resto, nombre) => aplicar(resto, nombre, null), actuales) : {},
    );
  }, []);

  return { errors, register, blur, revalidate, validateAll, clear };
}
