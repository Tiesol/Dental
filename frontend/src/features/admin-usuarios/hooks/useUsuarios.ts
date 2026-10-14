import { useEffect, useState } from 'react';
import { usersApi } from '@/api/endpoints/users';
import type { UserResponse } from '@/api/types';

type Estado =
  | { status: 'cargando' }
  | { status: 'ok'; usuarios: UserResponse[] }
  | { status: 'error'; mensaje: string };

export function useUsuarios(): Estado {
  const [estado, setEstado] = useState<Estado>({ status: 'cargando' });

  useEffect(() => {
    let activo = true;
    usersApi
      .listar()
      .then((usuarios) => {
        if (activo) setEstado({ status: 'ok', usuarios });
      })
      .catch((err: Error) => {
        if (activo) setEstado({ status: 'error', mensaje: err.message });
      });
    return () => {
      activo = false;
    };
  }, []);

  return estado;
}
