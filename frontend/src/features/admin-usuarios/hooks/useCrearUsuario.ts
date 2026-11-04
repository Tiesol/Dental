import { useCallback, useState } from 'react';
import { usersApi } from '@/api/endpoints/users';
import type { CreateUserRequest, UserDetail } from '@/api/types';

// Alta de personal (ODONTOLOGO o ADMIN) por el ADMIN.
export function useCrearUsuario() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const crear = useCallback(async (datos: CreateUserRequest): Promise<UserDetail | null> => {
    setEnviando(true);
    setError('');
    try {
      return await usersApi.crear(datos);
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setEnviando(false);
    }
  }, []);

  return { crear, enviando, error };
}
