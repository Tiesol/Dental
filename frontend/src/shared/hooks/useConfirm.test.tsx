import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useConfirm } from './useConfirm';

function Ejemplo({ onResultado }: { onResultado: (ok: boolean) => void }) {
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
          }).then(onResultado)
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
    render(<Ejemplo onResultado={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('muestra el diálogo con su título y su mensaje', async () => {
    const user = userEvent.setup();
    render(<Ejemplo onResultado={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    const dialogo = screen.getByRole('dialog', { name: '¿Deshabilitar a Ana?' });
    expect(dialogo).toHaveTextContent('No podrá iniciar sesión.');
  });

  it('resuelve true y cierra el diálogo al confirmar', async () => {
    const user = userEvent.setup();
    const onResultado = vi.fn();
    render(<Ejemplo onResultado={onResultado} />);

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(screen.getByRole('button', { name: 'Deshabilitar' }));

    expect(onResultado).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('resuelve false y cierra el diálogo al cancelar', async () => {
    const user = userEvent.setup();
    const onResultado = vi.fn();
    render(<Ejemplo onResultado={onResultado} />);

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onResultado).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
