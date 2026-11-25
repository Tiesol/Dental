import { useCallback, useEffect, useState } from 'react';
import { usersApi } from '@/api/endpoints/users';
import type { UpdateMyProfileRequest, UserDetail } from '@/api/types';
import { useAuth } from '@/features/auth';

type State =
  | { status: 'cargando' }
  | { status: 'ok'; profile: UserDetail }
  | { status: 'error'; message: string };

// Perfil del usuario autenticado. Al guardar refresca la sesión para que el nombre del menú
// se actualice. guardar lanza ApiError si el backend rechaza.
export function useMyProfile() {
  const { refresh } = useAuth();
  const [state, setState] = useState<State>({ status: 'cargando' });

  useEffect(() => {
    let active = true;
    usersApi
      .myProfile()
      .then((profile) => {
        if (active) setState({ status: 'ok', profile });
      })
      .catch((err: Error) => {
        if (active) setState({ status: 'error', message: err.message });
      });
    return () => {
      active = false;
    };
  }, []);

  const save = useCallback(
    async (changes: UpdateMyProfileRequest) => {
      const profile = await usersApi.updateMyProfile(changes);
      setState({ status: 'ok', profile });
      await refresh();
    },
    [refresh],
  );

  return { state, save };
}
