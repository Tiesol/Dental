import { useCallback, useEffect, useState } from 'react';
import { servicesApi } from '@/api/endpoints/services';
import type { ServiceResponse } from '@/api/types';

type State =
  | { status: 'cargando' }
  | { status: 'ok'; services: ServiceResponse[] }
  | { status: 'error'; message: string };

// Catálogo de servicios. El backend decide qué ve cada rol (el paciente, solo los habilitados).
// changeStatus (solo ADMIN) devuelve el mensaje de error o null.
export function useServices() {
  const [state, setState] = useState<State>({ status: 'cargando' });

  useEffect(() => {
    let active = true;
    servicesApi
      .list()
      .then((services) => {
        if (active) setState({ status: 'ok', services });
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
        const updated = await servicesApi.changeStatus(id, newValue);
        setState((e) =>
          e.status === 'ok'
            ? { ...e, services: e.services.map((s) => (s.id === id ? updated : s)) }
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
