import { useCallback, useEffect, useState } from 'react';
import { usersApi } from '@/api/endpoints/users';
import type { UpdateMyProfileRequest, UserDetail } from '@/api/types';
import { useAuth } from '@/features/auth';

type Estado =
  | { status: 'cargando' }
  | { status: 'ok'; perfil: UserDetail }
  | { status: 'error'; mensaje: string };

// Perfil del usuario autenticado. Al guardar refresca la sesión para que el nombre del
// encabezado y de "Hola, …" se actualicen. guardar lanza ApiError si el backend rechaza.
export function useMiPerfil() {
  const { refresh } = useAuth();
  const [estado, setEstado] = useState<Estado>({ status: 'cargando' });

  useEffect(() => {
    let activo = true;
    usersApi
      .miPerfil()
      .then((perfil) => {
        if (activo) setEstado({ status: 'ok', perfil });
      })
      .catch((err: Error) => {
        if (activo) setEstado({ status: 'error', mensaje: err.message });
      });
    return () => {
      activo = false;
    };
  }, []);

  const guardar = useCallback(
    async (cambios: UpdateMyProfileRequest) => {
      const perfil = await usersApi.actualizarMiPerfil(cambios);
      setEstado({ status: 'ok', perfil });
      await refresh();
    },
    [refresh],
  );

  return { estado, guardar };
}
