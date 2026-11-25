import { ServiceDisabledError } from '../../../common/errors/domain-error';
import { Role } from '../../../common/types/role';
import { ServiceRecord } from './service';

// Un servicio deshabilitado no está disponible para nuevas reservas (PDF sección 3).
// La usará el módulo de citas al reservar y reprogramar.
export function assertServiceEnabled(service: Pick<ServiceRecord, 'activo'>): void {
  if (!service.activo) {
    throw new ServiceDisabledError();
  }
}

// El ADMIN ve todo el catálogo (para gestionarlo); el resto solo los servicios habilitados.
export function canViewService(role: Role, service: Pick<ServiceRecord, 'activo'>): boolean {
  return role === 'ADMIN' || service.activo;
}

// Nombre normalizado para comparar duplicados: sin espacios sobrantes y sin distinguir mayúsculas.
export function normalizeServiceName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}
