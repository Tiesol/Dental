import { useCallback, useEffect, useState } from 'react';

export type Carga<T> =
  { status: 'cargando' } | { status: 'ok'; datos: T } | { status: 'error'; mensaje: string };

// Consulta al servidor con estado de carga. `cargar` debe venir de useCallback: al cambiar, se
// vuelve a consultar y se descarta la respuesta anterior. `recargar` repite la misma consulta.
export function useCarga<T>(cargar: () => Promise<T>) {
  const [version, setVersion] = useState(0);
  const [resultado, setResultado] = useState<{
    cargar: () => Promise<T>;
    version: number;
    carga: Carga<T>;
  } | null>(null);

  useEffect(() => {
    let vigente = true;
    cargar()
      .then((datos) => {
        if (vigente) setResultado({ cargar, version, carga: { status: 'ok', datos } });
      })
      .catch((err: Error) => {
        if (vigente) {
          setResultado({ cargar, version, carga: { status: 'error', mensaje: err.message } });
        }
      });
    return () => {
      vigente = false;
    };
  }, [cargar, version]);

  const recargar = useCallback(() => setVersion((actual) => actual + 1), []);
  // Al recargar la misma consulta se sigue mostrando lo anterior: así no se pierde la pantalla ni el
  // foco. Con una consulta distinta (otro filtro, otra fecha) sí se muestra "cargando".
  const estado: Carga<T> = resultado?.cargar === cargar ? resultado.carga : { status: 'cargando' };

  return { estado, recargar };
}
