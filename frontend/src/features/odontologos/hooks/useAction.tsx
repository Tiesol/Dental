import { useState } from 'react';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { SuccessMessage } from '@/shared/components/SuccessMessage';

// Ejecuta una acción mostrando "enviando", error o éxito. Evita repetir lo mismo en cada sección.
export function useAction() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const run = async (action: () => Promise<void>, successMessage: string) => {
    setError('');
    setSuccess('');
    setSending(true);
    try {
      await action();
      setSuccess(successMessage);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const messages = (
    <>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
    </>
  );

  return { sending, run, messages };
}
