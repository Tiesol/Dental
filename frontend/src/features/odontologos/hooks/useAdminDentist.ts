import { useCallback, useEffect, useState } from 'react';
import { dentistsApi } from '@/api/endpoints/dentists';
import type { DentistAdminResponse, UpdateDentistRequest } from '@/api/types';

type State =
  | { status: 'cargando' }
  | { status: 'ok'; dentist: DentistAdminResponse }
  | { status: 'error'; message: string };

// Un odontólogo para el ADMIN. Las acciones lanzan ApiError para que la página muestre el mensaje.
export function useAdminDentist(id: string) {
  const [state, setState] = useState<State>({ status: 'cargando' });

  useEffect(() => {
    let active = true;
    dentistsApi
      .getAdmin(id)
      .then((dentist) => {
        if (active) setState({ status: 'ok', dentist });
      })
      .catch((err: Error) => {
        if (active) setState({ status: 'error', message: err.message });
      });
    return () => {
      active = false;
    };
  }, [id]);

  const saveData = useCallback(
    async (changes: UpdateDentistRequest) => {
      setState({ status: 'ok', dentist: await dentistsApi.update(id, changes) });
    },
    [id],
  );

  const saveServices = useCallback(
    async (serviceIds: string[]) => {
      setState({ status: 'ok', dentist: await dentistsApi.assignServices(id, serviceIds) });
    },
    [id],
  );

  const changeStatus = useCallback(
    async (active: boolean) => {
      setState({ status: 'ok', dentist: await dentistsApi.changeStatus(id, active) });
    },
    [id],
  );

  return { state, saveData, saveServices, changeStatus };
}
