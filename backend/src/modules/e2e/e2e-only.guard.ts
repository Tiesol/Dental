import { CanActivate, Injectable } from '@nestjs/common';
import { RecursoNoEncontradoError } from '../../common/errors/domain-error';

// El seed borra toda la base: fuera de NODE_ENV=test estas rutas no existen para nadie.
@Injectable()
export class E2eOnlyGuard implements CanActivate {
  canActivate(): boolean {
    if (process.env.NODE_ENV !== 'test') {
      throw new RecursoNoEncontradoError('Recurso');
    }
    return true;
  }
}
