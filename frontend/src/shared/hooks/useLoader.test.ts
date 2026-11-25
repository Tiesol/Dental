import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLoader } from './useLoader';

describe('useLoader', () => {
  it('pasa de cargando a ok con los datos', async () => {
    const load = vi.fn().mockResolvedValue('datos');

    const { result } = renderHook(() => useLoader(load));

    expect(result.current.state).toEqual({ status: 'cargando' });
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ok', data: 'datos' }));
  });

  it('pasa a error con el mensaje', async () => {
    const load = vi.fn().mockRejectedValue(new Error('Falló'));

    const { result } = renderHook(() => useLoader(load));

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'error', message: 'Falló' }),
    );
  });

  it('al recargar conserva los datos a la vista hasta tener los nuevos', async () => {
    let release: (value: string) => void = () => undefined;
    const load = vi
      .fn()
      .mockResolvedValueOnce('antes')
      .mockImplementationOnce(() => new Promise((resolve) => (release = resolve)));
    const { result } = renderHook(() => useLoader(load));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ok', data: 'antes' }));

    act(() => result.current.reload());

    expect(result.current.state).toEqual({ status: 'ok', data: 'antes' });
    await act(async () => {
      release('despues');
      await Promise.resolve();
    });
    expect(result.current.state).toEqual({ status: 'ok', data: 'despues' });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('con otra consulta vuelve a cargando y descarta la respuesta anterior', async () => {
    const first = vi.fn().mockResolvedValue('primera');
    const second = vi.fn().mockResolvedValue('segunda');
    const { result, rerender } = renderHook(({ cargar: load }) => useLoader(load), {
      initialProps: { cargar: first },
    });
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ok', data: 'primera' }));

    rerender({ cargar: second });

    expect(result.current.state).toEqual({ status: 'cargando' });
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ok', data: 'segunda' }));
  });
});
