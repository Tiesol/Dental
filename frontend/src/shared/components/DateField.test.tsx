import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DateField } from './DateField';

function CampoControlado({
  min,
  inicial = '',
  onEmitir,
}: {
  min?: string;
  inicial?: string;
  onEmitir: (v: string) => void;
}) {
  const [valor, setValor] = useState(inicial);
  return (
    <>
      <DateField
        label="Fecha"
        value={valor}
        min={min}
        onChange={(v) => {
          setValor(v);
          onEmitir(v);
        }}
      />
      <button type="button">Fuera</button>
    </>
  );
}

describe('DateField', () => {
  it('emite la fecha ISO al escribir una fecha válida que cumple el mínimo', async () => {
    const onEmitir = vi.fn();
    const user = userEvent.setup();
    render(<CampoControlado min="2026-11-10" onEmitir={onEmitir} />);

    const input = screen.getByLabelText('Fecha');
    await user.type(input, '12/11/2026');

    expect(onEmitir).toHaveBeenLastCalledWith('2026-11-12');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('no emite fechas anteriores al mínimo al escribirlas y avisa al salir del campo', async () => {
    const onEmitir = vi.fn();
    const user = userEvent.setup();
    render(<CampoControlado min="2026-11-10" onEmitir={onEmitir} />);

    const input = screen.getByLabelText('Fecha');
    await user.type(input, '05/11/2026');

    expect(onEmitir).not.toHaveBeenCalledWith('2026-11-05');
    expect(input).toHaveValue('05/11/2026');

    await user.click(screen.getByRole('button', { name: 'Fuera' }));

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Elige una fecha desde el 10/11/2026')).toBeInTheDocument();
  });

  it('limpia el valor previo si se edita a una fecha anterior al mínimo y permite corregirla', async () => {
    const onEmitir = vi.fn();
    const user = userEvent.setup();
    render(<CampoControlado min="2026-11-10" inicial="2026-11-12" onEmitir={onEmitir} />);

    const input = screen.getByLabelText('Fecha');
    await user.clear(input);
    await user.type(input, '09/11/2026');

    expect(onEmitir).not.toHaveBeenCalledWith('2026-11-09');
    expect(onEmitir).toHaveBeenLastCalledWith('');

    await user.click(screen.getByRole('button', { name: 'Fuera' }));
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Elige una fecha desde el 10/11/2026')).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, '11/11/2026');

    expect(onEmitir).toHaveBeenLastCalledWith('2026-11-11');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('avisa si el formato queda incompleto al salir del campo', async () => {
    const onEmitir = vi.fn();
    const user = userEvent.setup();
    render(<CampoControlado onEmitir={onEmitir} />);

    const input = screen.getByLabelText('Fecha');
    await user.type(input, '12/11');
    await user.click(screen.getByRole('button', { name: 'Fuera' }));

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Escribe la fecha como dd/mm/aaaa')).toBeInTheDocument();
  });
});
