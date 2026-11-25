import { useCallback, useEffect, useState } from 'react';

export type LoadState<T> =
  { status: 'cargando' } | { status: 'ok'; data: T } | { status: 'error'; message: string };

// Consulta al servidor con estado de carga. `cargar` debe venir de useCallback: al cambiar, se
// cancela la petición anterior y se descarta su respuesta. `recargar` repite la misma consulta y
// `actualizar` cambia lo ya cargado sin volver a pedirlo (p. ej. con la respuesta de un PATCH).
export function useLoader<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    load: (signal: AbortSignal) => Promise<T>;
    version: number;
    state: LoadState<T>;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({ load, version, state: { status: 'ok', data } });
        }
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) {
          setResult({ load, version, state: { status: 'error', message: err.message } });
        }
      });
    return () => controller.abort();
  }, [load, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  const update = useCallback((change: (data: T) => T) => {
    setResult((current) =>
      current?.state.status === 'ok'
        ? { ...current, state: { status: 'ok', data: change(current.state.data) } }
        : current,
    );
  }, []);

  // Al recargar la misma consulta se sigue mostrando lo anterior: así no se pierde la pantalla ni el
  // foco. Con una consulta distinta (otro filtro, otra fecha) sí se muestra "cargando".
  const state: LoadState<T> = result?.load === load ? result.state : { status: 'cargando' };

  return { state, reload, update };
}
