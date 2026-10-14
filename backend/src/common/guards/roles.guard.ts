import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { CurrentUserData } from '../types/current-user';
import { Role } from '../types/role';

// Guard global: si la ruta declara @Roles(), el usuario autenticado debe tener uno de ellos.
// Se ejecuta después de JwtAuthGuard, así que request.user ya está presente.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: CurrentUserData }>();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('No tienes permiso para este recurso');
    }
    return true;
  }
}
