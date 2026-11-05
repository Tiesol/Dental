import type {
  DentistAdminResponse,
  DentistPublicResponse,
  ServiceResponse,
  UserDetail,
  UserResponse,
} from '@/api/types';

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

export function usuarioDetalleDePrueba(overrides: Partial<UserDetail> = {}): UserDetail {
  return {
    ...usuarioDePrueba(),
    paciente: { nombre: 'Ana', apellido: 'Pérez', telefono: null },
    odontologo: null,
    ...overrides,
  };
}

export function servicioDePrueba(overrides: Partial<ServiceResponse> = {}): ServiceResponse {
  return {
    id: 's1',
    nombre: 'Limpieza dental',
    descripcion: 'Eliminación de placa y sarro.',
    duracionMin: 45,
    precioReferencial: 150,
    activo: true,
    ...overrides,
  };
}

export function odontologoAdminDePrueba(
  overrides: Partial<DentistAdminResponse> = {},
): DentistAdminResponse {
  return {
    id: 'd1',
    userId: 'u9',
    email: 'laura@clinica.com',
    cuentaActiva: true,
    nombre: 'Dra. Laura Gómez',
    especialidad: 'Odontología general',
    activo: true,
    servicios: [{ id: 's1', nombre: 'Limpieza dental', duracionMin: 30, activo: true }],
    ...overrides,
  };
}

export function odontologoPublicoDePrueba(
  overrides: Partial<DentistPublicResponse> = {},
): DentistPublicResponse {
  return {
    id: 'd1',
    nombre: 'Dra. Laura Gómez',
    especialidad: 'Odontología general',
    servicios: [{ id: 's1', nombre: 'Limpieza dental', duracionMin: 30 }],
    ...overrides,
  };
}
