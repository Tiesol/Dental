import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../types/role';
import { RolesGuard } from './roles.guard';

class RutasDePrueba {
  publica() {}

  @Roles('ADMIN')
  soloAdmin() {}

  @Roles('ODONTOLOGO', 'ADMIN')
  odontologoOAdmin() {}
}

function contexto(handler: () => void, role?: Role): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => RutasDePrueba,
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());
  const rutas = RutasDePrueba.prototype;

  it('permite el acceso si la ruta no declara @Roles', () => {
    expect(guard.canActivate(contexto(rutas.publica, 'PACIENTE'))).toBe(true);
  });

  it('permite el acceso si el rol del usuario está entre los requeridos', () => {
    expect(guard.canActivate(contexto(rutas.soloAdmin, 'ADMIN'))).toBe(true);
    expect(guard.canActivate(contexto(rutas.odontologoOAdmin, 'ODONTOLOGO'))).toBe(true);
  });

  it('deniega con ForbiddenException si el rol no coincide', () => {
    expect(() => guard.canActivate(contexto(rutas.soloAdmin, 'PACIENTE'))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(contexto(rutas.odontologoOAdmin, 'PACIENTE'))).toThrow(
      ForbiddenException,
    );
  });

  it('deniega con ForbiddenException si no hay usuario en la petición', () => {
    expect(() => guard.canActivate(contexto(rutas.soloAdmin))).toThrow(ForbiddenException);
  });
});
