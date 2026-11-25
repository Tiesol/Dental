import { useCallback, useEffect, useState } from 'react';
import { dentistsApi } from '@/api/endpoints/dentists';
import type { DentistAdminResponse } from '@/api/types';

type State =
  | { status: 'cargando' }
  | { status: 'ok'; dentists: DentistAdminResponse[] }
  | { status: 'error'; message: string };

// Listado completo para el ADMIN, con habilitar/deshabilitar en línea (devuelve error o null).
export function useAdminDentists() {
  const [state, setState] = useState<State>({ status: 'cargando' });

  useEffect(() => {
    let active = true;
    dentistsApi
      .listAdmin()
      .then((dentists) => {
        if (active) setState({ status: 'ok', dentists });
      })
      .catch((err: Error) => {
        if (active) setState({ status: 'error', message: err.message });
      });
    return () => {
      active = false;
    };
  }, []);

  const changeStatus = useCallback(
    async (id: string, newValue: boolean): Promise<string | null> => {
      try {
        const updated = await dentistsApi.changeStatus(id, newValue);
        setState((e) =>
          e.status === 'ok'
            ? { ...e, dentists: e.dentists.map((d) => (d.id === id ? updated : d)) }
            : e,
        );
        return null;
      } catch (err) {
        return (err as Error).message;
      }
    },
    [],
  );

  return { state, changeStatus };
}
