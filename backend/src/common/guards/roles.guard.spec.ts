import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../types/role';
import { RolesGuard } from './roles.guard';

class TestRoutes {
  publicRoute() {}

  @Roles('ADMIN')
  adminOnly() {}

  @Roles('ODONTOLOGO', 'ADMIN')
  dentistOrAdmin() {}
}

function buildContext(handler: () => void, role?: Role): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => TestRoutes,
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());
  const routes = TestRoutes.prototype;

  it('permite el acceso si la ruta no declara @Roles', () => {
    expect(guard.canActivate(buildContext(routes.publicRoute, 'PACIENTE'))).toBe(true);
  });

  it('permite el acceso si el rol del usuario está entre los requeridos', () => {
    expect(guard.canActivate(buildContext(routes.adminOnly, 'ADMIN'))).toBe(true);
    expect(guard.canActivate(buildContext(routes.dentistOrAdmin, 'ODONTOLOGO'))).toBe(true);
  });

  it('deniega con ForbiddenException si el rol no coincide', () => {
    expect(() => guard.canActivate(buildContext(routes.adminOnly, 'PACIENTE'))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(buildContext(routes.dentistOrAdmin, 'PACIENTE'))).toThrow(
      ForbiddenException,
    );
  });

  it('deniega con ForbiddenException si no hay usuario en la petición', () => {
    expect(() => guard.canActivate(buildContext(routes.adminOnly))).toThrow(ForbiddenException);
  });
});
