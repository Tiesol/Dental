import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useConfirm } from './useConfirm';

function Ejemplo({ onResult }: { onResult: (ok: boolean) => void }) {
  const { confirm, dialog } = useConfirm();
  return (
    <>
      <button
        type="button"
        onClick={() =>
          void confirm({
            title: '¿Deshabilitar a Ana?',
            message: 'No podrá iniciar sesión.',
            confirmLabel: 'Deshabilitar',
          }).then(onResult)
        }
      >
        Abrir
      </button>
      {dialog}
    </>
  );
}

describe('useConfirm', () => {
  it('no muestra el diálogo hasta que se pide confirmar', () => {
    render(<Ejemplo onResult={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('muestra el diálogo con su título y su mensaje', async () => {
    const user = userEvent.setup();
    render(<Ejemplo onResult={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    const dialog = screen.getByRole('dialog', { name: '¿Deshabilitar a Ana?' });
    expect(dialog).toHaveTextContent('No podrá iniciar sesión.');
  });

  it('resuelve true y cierra el diálogo al confirmar', async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    render(<Ejemplo onResult={onResult} />);

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(screen.getByRole('button', { name: 'Deshabilitar' }));

    expect(onResult).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('resuelve false y cierra el diálogo al cancelar', async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    render(<Ejemplo onResult={onResult} />);

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onResult).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
