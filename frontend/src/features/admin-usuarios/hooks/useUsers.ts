import { useCallback, useEffect, useState } from 'react';
import { usersApi } from '@/api/endpoints/users';
import type { UserDetail } from '@/api/types';

type State =
  | { status: 'cargando' }
  | { status: 'ok'; users: UserDetail[] }
  | { status: 'error'; message: string };

// Listado de usuarios para el ADMIN, con la acción de habilitar/deshabilitar en línea.
export function useUsers() {
  const [state, setState] = useState<State>({ status: 'cargando' });

  useEffect(() => {
    let active = true;
    usersApi
      .list()
      .then((users) => {
        if (active) setState({ status: 'ok', users });
      })
      .catch((err: Error) => {
        if (active) setState({ status: 'error', message: err.message });
      });
    return () => {
      active = false;
    };
  }, []);

  // Devuelve el mensaje de error (o null) para que la página lo muestre junto a la fila.
  const changeStatus = useCallback(
    async (id: string, newValue: boolean): Promise<string | null> => {
      try {
        const updated = await usersApi.changeStatus(id, newValue);
        setState((e) =>
          e.status === 'ok' ? { ...e, users: e.users.map((u) => (u.id === id ? updated : u)) } : e,
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
