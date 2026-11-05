import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('muestra el título como encabezado principal junto a su descripción', () => {
    render(<PageHeader title="Usuarios" description="Cuentas de la clínica" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Usuarios' })).toBeInTheDocument();
    expect(screen.getByText('Cuentas de la clínica')).toBeInTheDocument();
  });

  it('muestra el enlace de regreso cuando se indica', () => {
    render(
      <MemoryRouter>
        <PageHeader title="Nuevo usuario" back={{ to: '/admin/usuarios', label: 'Volver' }} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/admin/usuarios');
  });

  it('muestra las acciones que recibe', () => {
    render(<PageHeader title="Servicios" actions={<button type="button">Nuevo</button>} />);

    expect(screen.getByRole('button', { name: 'Nuevo' })).toBeInTheDocument();
  });

  it('pone el título de la página en la pestaña del navegador', () => {
    render(
      <MemoryRouter>
        <PageHeader title="Mis citas" />
      </MemoryRouter>,
    );

    expect(document.title).toBe('Mis citas · Clínica Dental');
  });
});
