import { HttpResponse, http } from 'msw';
import type { LoginRequest } from '@/api/types';
import { usuarioDePrueba } from '../factories';

// Misma URL base que usa src/api/http.ts cuando VITE_API_URL no está definida.
export const API = 'http://localhost:3000/api/v1';

export const CREDENCIALES_VALIDAS = { email: 'ana@mail.com', password: 'secreta123' };
export const TOKEN_DE_PRUEBA = 'token-de-prueba';

// Handlers por defecto: el caso feliz de cada endpoint existente.
// Cada test sobreescribe lo que necesita con server.use(...).
export const handlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as LoginRequest;
    if (
      body.email.toLowerCase() === CREDENCIALES_VALIDAS.email &&
      body.password === CREDENCIALES_VALIDAS.password
    ) {
      return HttpResponse.json({ accessToken: TOKEN_DE_PRUEBA, user: usuarioDePrueba() });
    }
    return HttpResponse.json(
      { statusCode: 401, error: 'CREDENCIALES_INVALIDAS', message: 'Credenciales inválidas' },
      { status: 401 },
    );
  }),

  http.get(`${API}/auth/me`, ({ request }) => {
    if (request.headers.get('Authorization') !== `Bearer ${TOKEN_DE_PRUEBA}`) {
      return HttpResponse.json(
        { statusCode: 401, message: 'Token requerido o inválido' },
        { status: 401 },
      );
    }
    return HttpResponse.json(usuarioDePrueba());
  }),

  http.post(`${API}/auth/register`, () => HttpResponse.json(usuarioDePrueba(), { status: 201 })),

  http.get(`${API}/users`, () =>
    HttpResponse.json([usuarioDePrueba(), usuarioDePrueba({ id: 'u2', role: 'ADMIN' })]),
  ),
];
