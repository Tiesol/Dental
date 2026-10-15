import type { UserResponse } from '@/api/types';

// Datos de prueba con valores por defecto sensatos. Cada test sobreescribe lo que le importa.
export function usuarioDePrueba(overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    id: 'u1',
    email: 'ana@mail.com',
    role: 'PACIENTE',
    activo: true,
    createdAt: '2026-10-14T00:00:00.000Z',
    nombre: 'Ana Pérez',
    patientId: 'p1',
    ...overrides,
  };
}
