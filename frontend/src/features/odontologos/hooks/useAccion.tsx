import { useState } from 'react';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { SuccessMessage } from '@/shared/components/SuccessMessage';

// Ejecuta una acción mostrando "enviando", error o éxito. Evita repetir lo mismo en cada sección.
export function useAccion() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const ejecutar = async (accion: () => Promise<void>, mensajeExito: string) => {
    setError('');
    setExito('');
    setEnviando(true);
    try {
      await accion();
      setExito(mensajeExito);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const mensajes = (
    <>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {exito && <SuccessMessage>{exito}</SuccessMessage>}
    </>
  );

  return { enviando, ejecutar, mensajes };
}
