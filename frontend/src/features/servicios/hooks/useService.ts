import { useCallback, useEffect, useState } from 'react';
import { servicesApi } from '@/api/endpoints/services';
import type { ServiceResponse, UpdateServiceRequest } from '@/api/types';

type State =
  | { status: 'cargando' }
  | { status: 'ok'; service: ServiceResponse }
  | { status: 'error'; message: string };

// Un servicio para editarlo (ADMIN). guardar y changeStatus lanzan ApiError si el backend rechaza.
export function useService(id: string) {
  const [state, setState] = useState<State>({ status: 'cargando' });

  useEffect(() => {
    let active = true;
    servicesApi
      .get(id)
      .then((service) => {
        if (active) setState({ status: 'ok', service });
      })
      .catch((err: Error) => {
        if (active) setState({ status: 'error', message: err.message });
      });
    return () => {
      active = false;
    };
  }, [id]);

  const save = useCallback(
    async (changes: UpdateServiceRequest) => {
      setState({ status: 'ok', service: await servicesApi.update(id, changes) });
    },
    [id],
  );

  const changeStatus = useCallback(
    async (active: boolean) => {
      setState({ status: 'ok', service: await servicesApi.changeStatus(id, active) });
    },
    [id],
  );

  return { state, save, changeStatus };
}
