import { useCallback, useState } from 'react';
import { usersApi } from '@/api/endpoints/users';
import type { CreateUserRequest, UserDetail } from '@/api/types';

// Alta de personal (ODONTOLOGO o ADMIN) por el ADMIN.
export function useCreateUser() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const create = useCallback(async (data: CreateUserRequest): Promise<UserDetail | null> => {
    setSending(true);
    setError('');
    try {
      return await usersApi.create(data);
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setSending(false);
    }
  }, []);

  return { create, sending, error };
}
