import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../errors/domain-error';

// Traduce cualquier DomainError al formato de error uniforme de la API.
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter<DomainError> {
  catch(exception: DomainError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(exception.statusCode).json({
      statusCode: exception.statusCode,
      error: exception.error,
      message: exception.message,
      ...(exception.details !== undefined ? { details: exception.details } : {}),
    });
  }
}
