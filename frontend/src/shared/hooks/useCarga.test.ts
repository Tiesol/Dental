import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCarga } from './useCarga';

describe('useCarga', () => {
  it('pasa de cargando a ok con los datos', async () => {
    const cargar = vi.fn().mockResolvedValue('datos');

    const { result } = renderHook(() => useCarga(cargar));

    expect(result.current.estado).toEqual({ status: 'cargando' });
    await waitFor(() => expect(result.current.estado).toEqual({ status: 'ok', datos: 'datos' }));
  });

  it('pasa a error con el mensaje', async () => {
    const cargar = vi.fn().mockRejectedValue(new Error('Falló'));

    const { result } = renderHook(() => useCarga(cargar));

    await waitFor(() =>
      expect(result.current.estado).toEqual({ status: 'error', mensaje: 'Falló' }),
    );
  });

  it('al recargar conserva los datos a la vista hasta tener los nuevos', async () => {
    let liberar: (valor: string) => void = () => undefined;
    const cargar = vi
      .fn()
      .mockResolvedValueOnce('antes')
      .mockImplementationOnce(() => new Promise((resolve) => (liberar = resolve)));
    const { result } = renderHook(() => useCarga(cargar));
    await waitFor(() => expect(result.current.estado).toEqual({ status: 'ok', datos: 'antes' }));

    act(() => result.current.recargar());

    expect(result.current.estado).toEqual({ status: 'ok', datos: 'antes' });
    await act(async () => {
      liberar('despues');
      await Promise.resolve();
    });
    expect(result.current.estado).toEqual({ status: 'ok', datos: 'despues' });
    expect(cargar).toHaveBeenCalledTimes(2);
  });

  it('con otra consulta vuelve a cargando y descarta la respuesta anterior', async () => {
    const primera = vi.fn().mockResolvedValue('primera');
    const segunda = vi.fn().mockResolvedValue('segunda');
    const { result, rerender } = renderHook(({ cargar }) => useCarga(cargar), {
      initialProps: { cargar: primera },
    });
    await waitFor(() => expect(result.current.estado).toEqual({ status: 'ok', datos: 'primera' }));

    rerender({ cargar: segunda });

    expect(result.current.estado).toEqual({ status: 'cargando' });
    await waitFor(() => expect(result.current.estado).toEqual({ status: 'ok', datos: 'segunda' }));
  });
});
