# Clínica Dental — Sistema de citas

Monolito con backend **NestJS + Prisma + PostgreSQL** y frontend **React + Vite**.
Avance 1: módulo de autenticación (registro, login, JWT, roles) desarrollado con TDD.

```
backend/    → API NestJS (auth, users, prisma)
frontend/   → React + Vite (login, registro, mi cuenta, usuarios)
compose.yml → PostgreSQL de desarrollo (5434) y de test (5433)
```

## Requisitos

- Node.js 20+ y npm
- Docker

## Levantar el proyecto

```bash
# 1. Bases de datos
cp .env.example .env              # ajusta la contraseña
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env              # misma contraseña que en ../.env
cp .env.test.example .env.test
npm i
npx prisma migrate dev
npm run seed
npm run start:dev                 # http://localhost:3000

# 3. Frontend (otra terminal)
cd frontend
cp .env.example .env
npm i
npm run dev                       # http://localhost:5173
```

Usuarios del seed:

| Rol | Email | Contraseña |
|---|---|---|
| ADMIN | admin@clinica.com | Admin12345 |
| DENTIST | dentista@clinica.com | Dentista12345 |

Los pacientes se registran desde `/registro` o con `POST /auth/register`.

## Tests

Desde `backend/`, con `docker compose up -d` corriendo:

```bash
npm run test -- --verbose        # unitarios (Prisma y JWT mockeados)
npm run test:int -- --verbose    # integración (Supertest + BD de test real)
npm run test:all                 # ambos
npm run db:test:reset            # reinicia la BD de test por completo (opcional)
```

Los tests de integración aplican las migraciones a la BD de test antes de la suite
y vacían las tablas (`TRUNCATE ... CASCADE`) antes de cada test.

## API

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/auth/register` | Público | Registra un paciente |
| POST | `/auth/login` | Público | Devuelve `{ accessToken, user }` |
| GET | `/auth/me` | Autenticado | Usuario del token |
| GET | `/users` | ADMIN | Lista de usuarios |
