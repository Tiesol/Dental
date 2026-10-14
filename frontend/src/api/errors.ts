// Error tipado que devuelve el cliente HTTP. `message` viene en español desde el backend.
export class ApiError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servidor';
