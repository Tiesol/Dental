import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EstadoCitaBadge } from './EstadoCitaBadge';

describe('EstadoCitaBadge', () => {
  it('muestra el texto exacto del PDF', () => {
    render(<EstadoCitaBadge estado="EN_ATENCION" />);

    expect(screen.getByTestId('estado-cita')).toHaveTextContent('EN ATENCIÓN');
  });

  it('usa la clase del estado', () => {
    render(<EstadoCitaBadge estado="PENDIENTE" />);

    expect(screen.getByTestId('estado-cita')).toHaveClass('badge', 'badge-pendiente');
  });
});
