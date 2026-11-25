import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { API_PREFIX } from '../../src/app.setup';

export const apiPath = (path: string) => `/${API_PREFIX}${path}`;

// Obtiene un JWT real haciendo login contra la app.
// Recibe lo que devuelven las factories (usuario completo + password) y envía solo email y
// password: la API rechaza con 400 cualquier campo extra (forbidNonWhitelisted).
export async function loginAs(
  app: INestApplication,
  { email, password }: { email: string; password: string },
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post(apiPath('/auth/login'))
    .send({ email, password })
    .expect(200);
  return (res.body as { accessToken: string }).accessToken;
}

export function withToken(req: request.Test, token: string) {
  return req.set('Authorization', `Bearer ${token}`);
}
