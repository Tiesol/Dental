import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DateField } from './DateField';

function CampoControlado({
  min,
  inicial: initial = '',
  onEmit,
}: {
  min?: string;
  inicial?: string;
  onEmit: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <DateField
        label="Fecha"
        value={value}
        min={min}
        onChange={(v) => {
          setValue(v);
          onEmit(v);
        }}
      />
      <button type="button">Fuera</button>
    </>
  );
}

describe('DateField', () => {
  it('emite la fecha ISO al escribir una fecha válida que cumple el mínimo', async () => {
    const onEmit = vi.fn();
    const user = userEvent.setup();
    render(<CampoControlado min="2026-11-10" onEmit={onEmit} />);

    const input = screen.getByLabelText('Fecha');
    await user.type(input, '12/11/2026');

    expect(onEmit).toHaveBeenLastCalledWith('2026-11-12');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('no emite fechas anteriores al mínimo al escribirlas y avisa al salir del campo', async () => {
    const onEmit = vi.fn();
    const user = userEvent.setup();
    render(<CampoControlado min="2026-11-10" onEmit={onEmit} />);

    const input = screen.getByLabelText('Fecha');
    await user.type(input, '05/11/2026');

    expect(onEmit).not.toHaveBeenCalledWith('2026-11-05');
    expect(input).toHaveValue('05/11/2026');

    await user.click(screen.getByRole('button', { name: 'Fuera' }));

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Elige una fecha desde el 10/11/2026')).toBeInTheDocument();
  });

  it('limpia el valor previo si se edita a una fecha anterior al mínimo y permite corregirla', async () => {
    const onEmit = vi.fn();
    const user = userEvent.setup();
    render(<CampoControlado min="2026-11-10" inicial="2026-11-12" onEmit={onEmit} />);

    const input = screen.getByLabelText('Fecha');
    await user.clear(input);
    await user.type(input, '09/11/2026');

    expect(onEmit).not.toHaveBeenCalledWith('2026-11-09');
    expect(onEmit).toHaveBeenLastCalledWith('');

    await user.click(screen.getByRole('button', { name: 'Fuera' }));
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Elige una fecha desde el 10/11/2026')).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, '11/11/2026');

    expect(onEmit).toHaveBeenLastCalledWith('2026-11-11');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('avisa si el formato queda incompleto al salir del campo', async () => {
    const onEmit = vi.fn();
    const user = userEvent.setup();
    render(<CampoControlado onEmit={onEmit} />);

    const input = screen.getByLabelText('Fecha');
    await user.type(input, '12/11');
    await user.click(screen.getByRole('button', { name: 'Fuera' }));

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Escribe la fecha como dd/mm/aaaa')).toBeInTheDocument();
  });
});
