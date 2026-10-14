# Sistema de Citas para Clínica Dental — Proyecto Final Taller de Actualización V

Monolito con backend **NestJS 11 + Prisma 6 + PostgreSQL 16** y frontend **React 19 + Vite + TypeScript**. Autenticación JWT con Passport y roles `PACIENTE`, `ODONTOLOGO`, `ADMIN`. Tests con Jest + Supertest (backend), Vitest + React Testing Library (frontend) y Playwright (E2E). El requerimiento del docente es el PDF `proyecto_final_taller_v_citas_dentales.pdf`.

Estado actual: **Avance 1** (registro, login, JWT, roles, listado de usuarios para ADMIN) sobre la arquitectura definitiva del proyecto.

```
citas-dentales/
├── README.md                 <- este archivo: cómo levantar, índice, decisiones
├── CLAUDE.md                 <- punto de entrada para Claude Code en la raíz
├── compose.yml               <- PostgreSQL de desarrollo (5434) y de test (5433)
├── .env.example              <- variables para compose
├── backend/                  <- API NestJS
│   ├── CLAUDE.md             <- qué leer antes de tocar el backend
│   ├── ARQUITECTURA.md       <- capas, carpetas, modelo de datos, concurrencia, estados, seguridad, API, testing
│   ├── CONVENCIONES.md       <- idioma, nombres, TypeScript, Nest, errores, Prisma, tests, git, lint
│   └── .claude/              <- skills y agentes específicos del backend (ver abajo)
└── frontend/                 <- SPA React
    ├── CLAUDE.md
    ├── ARQUITECTURA.md       <- capas, features, rutas por rol, auth, caché, estados en UI, testing
    ├── CONVENCIONES.md       <- idioma, nombres, React, estilos, tests, data-testid, git, lint
    └── .claude/              <- skills y agentes específicos del frontend (ver abajo)
```

## Requisitos

- Node.js 20+ y npm
- Docker (para PostgreSQL)

## Levantar el proyecto

```bash
# 1. Bases de datos (desarrollo y test)
cp .env.example .env              # ajusta la contraseña
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env              # misma contraseña que en ../.env
cp .env.test.example .env.test
npm i
npx prisma migrate dev            # crea el esquema (incluye el constraint anti-solapamiento)
npm run seed                      # admin y odontólogo de ejemplo
npm run start:dev                 # http://localhost:3000/api/v1  — Swagger en /api/docs

# 3. Frontend (otra terminal)
cd frontend
cp .env.example .env
npm i
npm run dev                       # http://localhost:5173
```

Usuarios del seed:

| Rol        | Email                  | Contraseña      |
| ---------- | ---------------------- | --------------- |
| ADMIN      | admin@clinica.com      | Admin12345      |
| ODONTOLOGO | odontologo@clinica.com | Odontologo12345 |

Los pacientes se registran desde `/registro` o con `POST /api/v1/auth/register`.

> Si ya tenías la base de datos del avance anterior (esquema con `PATIENT/DENTIST`), la migración inicial fue reemplazada: ejecuta `npx prisma migrate reset` en `backend/` (y `npm run db:test:reset` para la de test) antes de `migrate dev`.

## Tests

Backend (desde `backend/`, con `docker compose up -d` corriendo):

```bash
npm run lint                     # ESLint + Prettier
npm run test -- --verbose        # unitarios (dominio y services con mocks)
npm run prisma:migrate:test      # aplica migraciones a la BD de test (lo hace también test:int)
npm run test:int -- --verbose    # integración (Supertest + BD de test real)
npm run test:all                 # ambos
npm run test:cov                 # cobertura
```

Frontend (desde `frontend/`):

```bash
npm run lint                     # ESLint (react-hooks, jsx-a11y, typescript-eslint) + Prettier
npm run build                    # type-check + build
```

Vitest, React Testing Library y Playwright están definidos en `frontend/ARQUITECTURA.md` y en los skills, pero todavía no están instalados ni configurados (no hay pantallas de citas que probar aún).

## API actual

Prefijo `/api/v1`. Errores con formato uniforme `{ statusCode, error, message, details? }`. Contrato completo previsto en `backend/ARQUITECTURA.md` sección 8.

| Método | Ruta             | Acceso       | Descripción                                    |
| ------ | ---------------- | ------------ | ---------------------------------------------- |
| POST   | `/auth/register` | Público      | Registra un paciente (nombre, apellido, email) |
| POST   | `/auth/login`    | Público      | Devuelve `{ accessToken, user }`               |
| GET    | `/auth/me`       | Autenticado  | Usuario del token                              |
| GET    | `/users`         | ADMIN        | Lista de usuarios                              |

## Skills y agentes de Claude Code

Viven por carpeta, en `backend/.claude/` y `frontend/.claude/`; son específicos de este proyecto (codifican el PDF del docente y la arquitectura decidida) y Claude Code los carga al trabajar dentro de cada carpeta. Lo que valía la pena de la librería genérica que había en la raíz (ciclo TDD, Definition of Done, checklists de seguridad y accesibilidad, revisión de código en cinco ejes, commits atómicos) quedó adaptado dentro de estos.

| Carpeta  | Skills                                                                                                                                                                       | Agentes                                                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| backend  | `reglas-de-negocio-citas` (fuente de verdad del PDF), `ciclo-tdd` (TDD + Definition of Done), `crear-modulo-nest`, `test-unitario-reglas`, `test-integracion-api`, `prisma-migraciones` | `revisor-reglas-negocio`, `revisor-tests-backend`, `auditor-seguridad-roles`, `revisor-codigo` |
| frontend | `reglas-de-negocio-citas` (vista UI), `ciclo-tdd`, `crear-feature`, `consumo-api`, `test-componente`, `e2e-playwright`                                                         | `revisor-flujos-ui`, `revisor-tests-frontend`, `revisor-accesibilidad-ux`, `revisor-codigo`    |

## Decisiones confirmadas

| Tema                          | Decisión                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| Frontend                      | React + Vite + TypeScript                                                                        |
| Backend                       | NestJS + TypeScript, arquitectura por módulos con capas controller → service → domain → repository |
| Base de datos                 | PostgreSQL + Prisma, modelo con nombres de dominio en español (`PACIENTE`, `horaInicio`, `estado`) |
| Tests unitarios / integración | Jest + Supertest (backend), Vitest + React Testing Library (frontend)                            |
| E2E                           | Playwright, en `frontend/e2e/`                                                                   |
| Autenticación                 | JWT con Passport; roles `PACIENTE`, `ODONTOLOGO`, `ADMIN`                                        |
| Linters                       | ESLint + Prettier en backend y frontend (`printWidth` 100, comillas simples, trailing commas)    |
| Skills y agentes              | Formato Claude Code por carpeta                                                                  |

## Decisiones tomadas al redactar (revisar y corregir si no estás de acuerdo)

No están en el PDF ni fueron confirmadas explícitamente; se eligió la opción más habitual y se deja explícita aquí.

1. **Idioma**: identificadores técnicos en inglés (clases, archivos, métodos, `id`, `createdAt`); atributos del dominio con el nombre del PDF en español (`nombre`, `especialidad`, `duracionMin`, `horaInicio`, `estado`, `activo`); textos, mensajes, comentarios y nombres de tests en español.
2. **Gestor de paquetes**: npm.
3. **Tests unitarios colocados junto al código** (`*.spec.ts` en `src/`), como hace NestJS por defecto; integración en `test/integration/` y helpers en `test/helpers/`.
4. **Prevención de doble reserva**: transacción Prisma con `SELECT ... FOR UPDATE` sobre el odontólogo **más** constraint de exclusión en PostgreSQL (`btree_gist`), ya incluido en la migración inicial.
5. **Transiciones de estado y roles** (tabla en `backend/ARQUITECTURA.md` sección 6): confirmar solo ADMIN; iniciar y finalizar solo el odontólogo asignado; cancelar paciente dueño o ADMIN desde PENDIENTE/CONFIRMADA; EN_ATENCION no se cancela. **Pendientes**: ¿puede el ADMIN cancelar una cita EN_ATENCION? ¿puede el ODONTOLOGO confirmar sus propias citas?
6. **Finalizar exige observación** (EN_ATENCION → FINALIZADA solo con observación registrada).
7. **Fechas**: se almacenan en UTC (`timestamptz`); los horarios de atención se guardan en minutos desde las 00:00 en la zona de la clínica. La zona irá en `CLINIC_TIMEZONE` / `VITE_CLINIC_TIMEZONE`. **Falta definir cuál** (por ejemplo `America/La_Paz`).
8. **Intervalos semiabiertos** `[inicio, fin)`: citas consecutivas no se solapan.
9. **Librerías del frontend propuestas, no confirmadas**: TanStack Query para caché de datos de servidor, MSW para simular la API en tests, CSS Modules para estilos, `date-fns` + `date-fns-tz` para fechas. El código actual usa React Router (ya estaba), hooks simples y CSS global; se migrará cuando se confirme.
10. **Token JWT en el frontend**: en `localStorage`, encapsulado en `src/api/token.ts`.
11. **Swagger** en `/api/docs`.
12. **Git**: rama `main`, ramas `feat/`, `fix/`, `test/`, `docs/`, `refactor/`; Conventional Commits.
13. **Cobertura mínima**: 90% en dominio y services del backend y en `shared/lib/` y hooks del frontend.
