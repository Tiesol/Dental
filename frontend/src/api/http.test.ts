import { HttpResponse, http as mswHttp } from 'msw';
import { describe, expect, it } from 'vitest';
import { API, TOKEN_DE_PRUEBA } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { ApiError, MENSAJE_SIN_CONEXION } from './errors';
import { http } from './http';
import { tokenStore } from './token';

describe('cliente HTTP', () => {
  it('adjunta el token guardado como Bearer en el header Authorization', async () => {
    // Arrange
    let authorization: string | null = null;
    server.use(
      mswHttp.get(`${API}/ping`, ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    tokenStore.set(TOKEN_DE_PRUEBA);

    // Act
    await http.get('/ping');

    // Assert
    expect(authorization).toBe(`Bearer ${TOKEN_DE_PRUEBA}`);
  });

  it('no envía Authorization cuando no hay token', async () => {
    let authorization: string | null = 'sin-leer';
    server.use(
      mswHttp.get(`${API}/ping`, ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    await http.get('/ping');

    expect(authorization).toBeNull();
  });

  it('convierte un error del backend en ApiError con su statusCode y message en español', async () => {
    server.use(
      mswHttp.post(`${API}/appointments`, () =>
        HttpResponse.json(
          {
            statusCode: 409,
            error: 'HORARIO_NO_DISPONIBLE',
            message: 'El horario ya no está disponible',
          },
          { status: 409 },
        ),
      ),
    );

    const peticion = http.post('/appointments', {});

    await expect(peticion).rejects.toBeInstanceOf(ApiError);
    await expect(peticion).rejects.toMatchObject({
      statusCode: 409,
      message: 'El horario ya no está disponible',
    });
  });

  it('une en una frase los mensajes múltiples que devuelve la validación del backend', async () => {
    server.use(
      mswHttp.post(`${API}/auth/register`, () =>
        HttpResponse.json(
          { statusCode: 400, message: ['El email no es válido', 'El nombre es obligatorio'] },
          { status: 400 },
        ),
      ),
    );

    await expect(http.post('/auth/register', {})).rejects.toMatchObject({
      statusCode: 400,
      message: 'El email no es válido. El nombre es obligatorio',
    });
  });

  it('devuelve un ApiError con el mensaje de sin conexión si la red falla', async () => {
    server.use(mswHttp.get(`${API}/ping`, () => HttpResponse.error()));

    const peticion = http.get('/ping');

    await expect(peticion).rejects.toBeInstanceOf(ApiError);
    await expect(peticion).rejects.toMatchObject({ statusCode: 0, message: MENSAJE_SIN_CONEXION });
  });
});
