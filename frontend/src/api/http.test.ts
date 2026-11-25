import { HttpResponse, http as mswHttp } from 'msw';
import { describe, expect, it } from 'vitest';
import { API, TEST_TOKEN } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { ApiError, OFFLINE_MESSAGE } from './errors';
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
    tokenStore.set(TEST_TOKEN);

    // Act
    await http.get('/ping');

    // Assert
    expect(authorization).toBe(`Bearer ${TEST_TOKEN}`);
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

    const request = http.post('/appointments', {});

    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({
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

    const request = http.get('/ping');

    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({ statusCode: 0, message: OFFLINE_MESSAGE });
  });
});
