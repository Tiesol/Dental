import { useCallback, useEffect, useState } from 'react';
import { usersApi } from '@/api/endpoints/users';
import type { UpdateUserRequest, UserDetail } from '@/api/types';

type State =
  | { status: 'cargando' }
  | { status: 'ok'; user: UserDetail }
  | { status: 'error'; message: string };

// Detalle de un usuario para el ADMIN: cargar, guardar cambios y habilitar/deshabilitar.
// guardar y changeStatus lanzan ApiError para que el formulario muestre el mensaje.
export function useUser(id: string) {
  const [state, setState] = useState<State>({ status: 'cargando' });

  useEffect(() => {
    let active = true;
    usersApi
      .get(id)
      .then((user) => {
        if (active) setState({ status: 'ok', user });
      })
      .catch((err: Error) => {
        if (active) setState({ status: 'error', message: err.message });
      });
    return () => {
      active = false;
    };
  }, [id]);

  const save = useCallback(
    async (changes: UpdateUserRequest) => {
      const user = await usersApi.update(id, changes);
      setState({ status: 'ok', user });
    },
    [id],
  );

  const changeStatus = useCallback(
    async (active: boolean) => {
      const user = await usersApi.changeStatus(id, active);
      setState({ status: 'ok', user });
    },
    [id],
  );

  return { state, save, changeStatus };
}
