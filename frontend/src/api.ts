const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type Role = 'PATIENT' | 'DENTIST' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // ValidationPipe devuelve message como arreglo; el resto como string.
    const message = Array.isArray(data?.message)
      ? data.message.join('. ')
      : (data?.message ?? 'Error inesperado');
    throw new ApiError(res.status, message);
  }
  return data as T;
}
