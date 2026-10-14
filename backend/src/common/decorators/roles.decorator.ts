import { SetMetadata } from '@nestjs/common';
import { Role } from '../types/role';

export const ROLES_KEY = 'roles';

// Restringe una ruta (o un controller completo) a los roles indicados. Lo aplica RolesGuard.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
