import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserData } from '../types/current-user';

// Inyecta el usuario autenticado en un handler. Único modo permitido de leer request.user.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserData =>
    context.switchToHttp().getRequest<{ user: CurrentUserData }>().user,
);
