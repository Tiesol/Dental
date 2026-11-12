import { useCallback, useEffect, useState } from 'react';

export type Carga<T> =
  { status: 'cargando' } | { status: 'ok'; datos: T } | { status: 'error'; mensaje: string };

// Consulta al servidor con estado de carga. `cargar` debe venir de useCallback: al cambiar, se
// cancela la petición anterior y se descarta su respuesta. `recargar` repite la misma consulta y
// `actualizar` cambia lo ya cargado sin volver a pedirlo (p. ej. con la respuesta de un PATCH).
export function useCarga<T>(cargar: (signal: AbortSignal) => Promise<T>) {
  const [version, setVersion] = useState(0);
  const [resultado, setResultado] = useState<{
    cargar: (signal: AbortSignal) => Promise<T>;
    version: number;
    carga: Carga<T>;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    cargar(controller.signal)
      .then((datos) => {
        if (!controller.signal.aborted) {
          setResultado({ cargar, version, carga: { status: 'ok', datos } });
        }
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) {
          setResultado({ cargar, version, carga: { status: 'error', mensaje: err.message } });
        }
      });
    return () => controller.abort();
  }, [cargar, version]);

  const recargar = useCallback(() => setVersion((actual) => actual + 1), []);

  const actualizar = useCallback((cambio: (datos: T) => T) => {
    setResultado((actual) =>
      actual?.carga.status === 'ok'
        ? { ...actual, carga: { status: 'ok', datos: cambio(actual.carga.datos) } }
        : actual,
    );
  }, []);

  // Al recargar la misma consulta se sigue mostrando lo anterior: así no se pierde la pantalla ni el
  // foco. Con una consulta distinta (otro filtro, otra fecha) sí se muestra "cargando".
  const estado: Carga<T> = resultado?.cargar === cargar ? resultado.carga : { status: 'cargando' };

  return { estado, recargar, actualizar };
}
