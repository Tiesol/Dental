import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActiveBadge } from './ActiveBadge';
import { EmptyState } from './EmptyState';
import { ErrorMessage } from './ErrorMessage';
import { LoadingState } from './LoadingState';
import { SuccessMessage } from './SuccessMessage';

describe('estados de pantalla compartidos', () => {
  it('EmptyState muestra el título, la descripción y la acción', () => {
    render(
      <EmptyState
        title="No hay servicios"
        description="Crea el primero."
        action={<button type="button">Nuevo servicio</button>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'No hay servicios' })).toBeInTheDocument();
    expect(screen.getByText('Crea el primero.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo servicio' })).toBeInTheDocument();
  });

  it('ErrorMessage anuncia el mensaje como alerta con el testid de los E2E', () => {
    render(<ErrorMessage>No se pudo conectar con el servidor</ErrorMessage>);

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor');
    expect(screen.getByTestId('error-mensaje')).toBeInTheDocument();
  });

  it('SuccessMessage anuncia el mensaje como estado', () => {
    render(<SuccessMessage>Perfil actualizado</SuccessMessage>);

    expect(screen.getByRole('status')).toHaveTextContent('Perfil actualizado');
  });

  it('LoadingState anuncia que el contenido se está cargando', () => {
    render(<LoadingState />);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
  });

  it('ActiveBadge indica el estado con texto y no solo con color', () => {
    const { rerender } = render(<ActiveBadge active />);
    expect(screen.getByText('Habilitado')).toBeInTheDocument();

    rerender(<ActiveBadge active={false} />);
    expect(screen.getByText('Deshabilitado')).toBeInTheDocument();
  });
});
