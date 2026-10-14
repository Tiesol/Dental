import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marca una ruta como accesible sin token. JwtAuthGuard es global; esta es la única excepción.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
