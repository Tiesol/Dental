import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

class RutasDePrueba {
  publica() {}

  @Roles(Role.ADMIN)
  soloAdmin() {}
}

function contexto(handler: () => void, role: Role): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => RutasDePrueba,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());
  const rutas = RutasDePrueba.prototype;

  it('permite el acceso si la ruta no tiene @Roles', () => {
    expect(guard.canActivate(contexto(rutas.publica, Role.PATIENT))).toBe(true);
  });

  it('deniega el acceso con ForbiddenException si el rol no coincide', () => {
    expect(() =>
      guard.canActivate(contexto(rutas.soloAdmin, Role.PATIENT)),
    ).toThrow(ForbiddenException);
  });
});
