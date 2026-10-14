import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { API_PREFIX } from '../../src/app.setup';

export const ruta = (path: string) => `/${API_PREFIX}${path}`;

// Obtiene un JWT real haciendo login contra la app.
export async function loginComo(
  app: INestApplication,
  credenciales: { email: string; password: string },
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post(ruta('/auth/login'))
    .send(credenciales)
    .expect(200);
  return (res.body as { accessToken: string }).accessToken;
}

export function conToken(req: request.Test, token: string) {
  return req.set('Authorization', `Bearer ${token}`);
}
