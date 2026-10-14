import { ApiError, MENSAJE_SIN_CONEXION } from './errors';
import { tokenStore } from './token';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

type Options = { body?: unknown };

// Único punto de acceso a la red. Adjunta el JWT y traduce todo fallo a ApiError.
async function request<T>(method: string, path: string, options: Options = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, MENSAJE_SIN_CONEXION);
  }

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, extraerMensaje(data), data);
  }
  return data as T;
}

// ValidationPipe devuelve `message` como arreglo; el filtro de dominio como string.
function extraerMensaje(data: unknown): string {
  if (data && typeof data === 'object' && 'message' in data) {
    const { message } = data as { message: unknown };
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string') return message;
  }
  return 'Error inesperado';
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
