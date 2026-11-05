# Sistema de Citas para Clínica Dental — Proyecto Final Taller de Actualización V

[![CI](https://github.com/Tiesol/Dental/actions/workflows/ci.yml/badge.svg)](https://github.com/Tiesol/Dental/actions/workflows/ci.yml)

Monolito con backend **NestJS 11 + Prisma 6 + PostgreSQL 16** y frontend **React 19 + Vite + TypeScript**. Autenticación JWT con Passport y roles `PACIENTE`, `ODONTOLOGO`, `ADMIN`. Tests con Jest + Supertest (backend), Vitest + React Testing Library (frontend) y Playwright (E2E). El requerimiento del docente es el PDF `proyecto_final_taller_v_citas_dentales.pdf`.

Estado actual: **funcionalidad completa del PDF**: registro y login, roles, servicios, odontólogos, horarios y bloques, disponibilidad, reservas sin dobles reservas, reprogramación, cancelación, estados de la cita, agenda del odontólogo y observación, con tests unitarios, de integración y E2E.

```
citas-dentales/
├── README.md                 <- este archivo: cómo levantar, índice, decisiones
├── CONTRIBUTING.md           <- ramas, formato de commits, pull requests, hooks
├── CLAUDE.md                 <- punto de entrada para Claude Code en la raíz
├── compose.yml               <- PostgreSQL de desarrollo (5434) y de test (5433)
├── .env.example              <- variables para compose
├── package.json              <- tooling compartido: husky, commitlint, lint-staged
├── commitlint.config.mjs     <- tipos y ámbitos de commit permitidos
├── lint-staged.config.mjs    <- lint y formato de los archivos en stage (pre-commit); backend/ y frontend/ tienen su .lintstagedrc.json
├── .husky/                   <- hooks de git (pre-commit, commit-msg)
├── .github/                  <- workflow de CI y plantilla de pull request
├── .editorconfig, .gitattributes <- formato e indentación comunes, fin de línea LF
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
# 0. Hooks de git (una sola vez, en la raíz): commitlint + lint-staged
npm install

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

| Rol        | Email                    | Contraseña      |
| ---------- | ------------------------ | --------------- |
| ADMIN      | admin@clinica.com        | Admin12345      |
| ODONTOLOGO | odontologo@clinica.com   | Odontologo12345 |
| ODONTOLOGO | ortodoncista@clinica.com | Odontologo12345 |

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
npm run test                     # unitarios y de componentes (Vitest + React Testing Library + MSW)
npm run test:cov                 # con cobertura
npm run build                    # type-check + build
npx playwright install chromium  # una sola vez
npm run test:e2e                 # E2E con Playwright: levanta backend y frontend solos
npm run test:e2e:ui              # modo visual para la demostración
```

Los E2E recorren la interfaz real contra el backend y la base de test. Playwright levanta el backend en modo test (puerto 3100, con la hora fija en lunes 9 de noviembre de 2026) y el frontend (puerto 5199), así que no chocan con los servidores de desarrollo. Antes de cada escenario, el seed de E2E deja datos conocidos; sus rutas solo existen con `NODE_ENV=test`.

### Correr toda la suite desde cero

```bash
npm install                                  # en la raíz, una vez
cp .env.example .env
docker compose up -d                         # PostgreSQL de desarrollo y de test

cd backend
cp .env.test.example .env.test
npm ci
npm run lint && npm run test && npm run test:int

cd ../frontend
npm ci
npx playwright install chromium              # una sola vez
npm run lint && npm run test && npm run build
npm run test:e2e
```

Todo se puede repetir las veces que haga falta: los tests de integración y los E2E vacían la base de test antes de empezar.

## Flujo de trabajo

Ver `CONTRIBUTING.md`: ramas cortas desde `main`, commits en formato Conventional Commits (validados por un hook de git y por el CI), pull request con la plantilla y el CI en verde antes de mezclar. El CI (`.github/workflows/ci.yml`) corre en cada PR: lint, formato, tests unitarios, integración del backend con PostgreSQL, build, E2E y validación de los mensajes de commit.

## API actual

Prefijo `/api/v1`. Errores con formato uniforme `{ statusCode, error, message, details? }`. Contrato completo previsto en `backend/ARQUITECTURA.md` sección 8.

| Método | Ruta                                    | Acceso                             | Descripción                                            |
| ------ | --------------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| POST   | `/auth/register`                        | Público                            | Registra un paciente (nombre, apellido, email)         |
| POST   | `/auth/login`                           | Público                            | Devuelve `{ accessToken, user }`                       |
| GET    | `/auth/me`                              | Autenticado                        | Usuario del token                                      |
| GET    | `/users`                                | ADMIN                              | Lista de usuarios con su perfil                        |
| POST   | `/users`                                | ADMIN                              | Crea un ODONTOLOGO o un ADMIN                          |
| GET    | `/users/:id`                            | ADMIN                              | Detalle de un usuario                                  |
| PATCH  | `/users/:id`                            | ADMIN                              | Edita email y perfil (el rol no cambia)                |
| PATCH  | `/users/:id/estado`                     | ADMIN                              | Habilita/deshabilita una cuenta (no la propia)         |
| GET    | `/users/me`                             | Autenticado                        | Mi perfil                                              |
| PATCH  | `/users/me`                             | Autenticado                        | Edito mi perfil                                        |
| PATCH  | `/users/me/password`                    | Autenticado                        | Cambio mi contraseña (verifica la actual)              |
| GET    | `/services`                             | Autenticado                        | Catálogo (no-ADMIN: solo habilitados)                  |
| GET    | `/services/:id`                         | Autenticado                        | Detalle (deshabilitado: solo ADMIN)                    |
| POST   | `/services`                             | ADMIN                              | Crea un servicio                                       |
| PATCH  | `/services/:id`                         | ADMIN                              | Edita nombre, descripción, duración o precio           |
| PATCH  | `/services/:id/estado`                  | ADMIN                              | Habilita/deshabilita un servicio                       |
| GET    | `/dentists?serviceId=`                  | Autenticado                        | Odontólogos (no-ADMIN: solo los que aceptan citas)     |
| GET    | `/dentists/:id`                         | Autenticado                        | Detalle (deshabilitado: solo ADMIN)                    |
| POST   | `/dentists`                             | ADMIN                              | Registra odontólogo: cuenta + perfil + servicios       |
| PATCH  | `/dentists/:id`                         | ADMIN                              | Edita nombre y especialidad                            |
| PATCH  | `/dentists/:id/estado`                  | ADMIN                              | Habilita/deshabilita al profesional                    |
| PUT    | `/dentists/:id/services`                | ADMIN                              | Reemplaza los servicios que realiza                    |
| GET    | `/dentists/:id/availability`            | Autenticado                        | Horarios y bloques vigentes (`motivo` solo para ADMIN) |
| PUT    | `/dentists/:id/availability`            | ADMIN                              | Reemplaza todos los horarios                           |
| POST   | `/dentists/:id/blocks`                  | ADMIN                              | Crea un bloque no disponible                           |
| DELETE | `/dentists/:id/blocks/:blockId`         | ADMIN                              | Borra un bloque                                        |
| GET    | `/dentists/:id/slots?serviceId=&fecha=` | Autenticado                        | Horarios disponibles de un día                         |
| POST   | `/appointments`                         | PACIENTE                           | Reserva una cita                                       |
| GET    | `/appointments/mine?cuando=`            | PACIENTE                           | Mis citas: próximas o historial                        |
| GET    | `/appointments`                         | ADMIN                              | Todas las citas, con filtros y paginación              |
| GET    | `/appointments/:id`                     | Dueño, odontólogo asignado o ADMIN | Detalle (ajena: `403`)                                 |
| PATCH  | `/appointments/:id/reschedule`          | Dueño o ADMIN                      | Reprograma; si falla, la cita no cambia                |
| PATCH  | `/appointments/:id/cancel`              | Dueño o ADMIN                      | Cancela y libera el horario                            |
| PATCH  | `/appointments/:id/status`              | ADMIN u ODONTOLOGO                 | Cambia el estado según la transición                   |
| POST   | `/appointments/:id/observation`         | Odontólogo asignado                | Registra la observación                                |
| GET    | `/dentists/me/agenda?fecha=`            | ODONTOLOGO                         | Mis citas de un día, hoy por defecto                   |
| GET    | `/dentists/me/agenda/upcoming?limit=`   | ODONTOLOGO                         | Mis próximas citas                                     |

`POST /auth/login` y `POST /auth/register` admiten 10 intentos por minuto e IP (`AUTH_THROTTLE_LIMIT`); al pasarse responden `429`.

## Skills y agentes de Claude Code

Viven por carpeta, en `backend/.claude/` y `frontend/.claude/`; son específicos de este proyecto (codifican el PDF del docente y la arquitectura decidida) y Claude Code los carga al trabajar dentro de cada carpeta. Lo que valía la pena de la librería genérica que había en la raíz (ciclo TDD, Definition of Done, checklists de seguridad y accesibilidad, revisión de código en cinco ejes, commits atómicos) quedó adaptado dentro de estos.

| Carpeta  | Skills                                                                                                                                                                                  | Agentes                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| backend  | `reglas-de-negocio-citas` (fuente de verdad del PDF), `ciclo-tdd` (TDD + Definition of Done), `crear-modulo-nest`, `test-unitario-reglas`, `test-integracion-api`, `prisma-migraciones` | `revisor-reglas-negocio`, `revisor-tests-backend`, `auditor-seguridad-roles`, `revisor-codigo` |
| frontend | `reglas-de-negocio-citas` (vista UI), `ciclo-tdd`, `crear-feature`, `consumo-api`, `test-componente`, `e2e-playwright`                                                                  | `revisor-flujos-ui`, `revisor-tests-frontend`, `revisor-accesibilidad-ux`, `revisor-codigo`    |

## Decisiones confirmadas

| Tema                          | Decisión                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| Frontend                      | React + Vite + TypeScript                                                                          |
| Backend                       | NestJS + TypeScript, arquitectura por módulos con capas controller → service → domain → repository |
| Base de datos                 | PostgreSQL + Prisma, modelo con nombres de dominio en español (`PACIENTE`, `horaInicio`, `estado`) |
| Tests unitarios / integración | Jest + Supertest (backend), Vitest + React Testing Library (frontend)                              |
| E2E                           | Playwright, en `frontend/e2e/`                                                                     |
| Autenticación                 | JWT con Passport; roles `PACIENTE`, `ODONTOLOGO`, `ADMIN`                                          |
| Linters                       | ESLint + Prettier en backend y frontend (`printWidth` 100, comillas simples, trailing commas)      |
| Skills y agentes              | Formato Claude Code por carpeta                                                                    |

## Decisiones tomadas al redactar (revisar y corregir si no estás de acuerdo)

No están en el PDF ni fueron confirmadas explícitamente; se eligió la opción más habitual y se deja explícita aquí.

1. **Idioma**: identificadores técnicos en inglés (clases, archivos, métodos, `id`, `createdAt`); atributos del dominio con el nombre del PDF en español (`nombre`, `especialidad`, `duracionMin`, `horaInicio`, `estado`, `activo`); textos, mensajes, comentarios y nombres de tests en español.
2. **Gestor de paquetes**: npm.
3. **Tests unitarios colocados junto al código** (`*.spec.ts` en `src/`), como hace NestJS por defecto; integración en `test/integration/` y helpers en `test/helpers/`.
4. **Prevención de doble reserva**: transacción Prisma con `SELECT ... FOR UPDATE` sobre el odontólogo **más** constraint de exclusión en PostgreSQL (`btree_gist`), ya incluido en la migración inicial.
5. **Transiciones de estado y roles** (tabla en `backend/ARQUITECTURA.md` sección 6): confirmar solo ADMIN; iniciar y finalizar solo el odontólogo asignado; cancelar paciente dueño o ADMIN desde PENDIENTE/CONFIRMADA; EN_ATENCION no se cancela. El ADMIN tampoco cancela una cita EN_ATENCION (confirmado). **Pendiente**: ¿puede el ODONTOLOGO confirmar sus propias citas? (por defecto, no).
6. **Finalizar exige observación** (EN_ATENCION → FINALIZADA solo con observación registrada).
7. **Fechas**: se almacenan en UTC (`timestamptz`); los horarios de atención se guardan en minutos desde las 00:00 en la zona de la clínica. La zona se configura en `CLINIC_TIMEZONE` (`America/La_Paz` por defecto).
8. **Intervalos semiabiertos** `[inicio, fin)`: citas consecutivas no se solapan.
9. **Librerías del frontend propuestas, no confirmadas**: TanStack Query para caché de datos de servidor, MSW para simular la API en tests, CSS Modules para estilos, `date-fns` + `date-fns-tz` para fechas. El código actual usa React Router (ya estaba), hooks simples y CSS global; se migrará cuando se confirme.
10. **Token JWT en el frontend**: en `localStorage`, encapsulado en `src/api/token.ts`.
11. **Swagger** en `/api/docs`.
12. **Git**: rama `main`, ramas `feat/`, `fix/`, `test/`, `docs/`, `refactor/`; Conventional Commits.
13. **Cobertura mínima**: 90% en dominio y services del backend y en `shared/lib/` y hooks del frontend.
14. **Gestión de usuarios (confirmado)**: el ADMIN crea cuentas ODONTOLOGO (con nombre y especialidad) y ADMIN; los pacientes solo se registran solos. El **rol no se puede cambiar** después de creado (un PACIENTE tiene citas en su perfil y un ODONTOLOGO necesita perfil con especialidad). El ADMIN edita email y datos de perfil, y habilita/deshabilita cuentas, salvo la suya.
15. **Mi cuenta (confirmado)**: el PACIENTE edita nombre, apellido y teléfono; el ODONTOLOGO solo su nombre (especialidad y email los gestiona el ADMIN); el ADMIN no tiene perfil. Cambiar la contraseña exige la actual. Un campo que no aplica al rol se rechaza con `400`, no se ignora.
16. **Cuenta deshabilitada = sin acceso inmediato**: la estrategia JWT consulta el usuario en cada petición (una lectura por id) para que deshabilitar surta efecto al instante y no a las 8 h, cuando expira el token.
17. **`User.activo` ≠ `Dentist.activo`**: el primero impide iniciar sesión (gestión de usuarios); el segundo, que el odontólogo reciba nuevas citas (lo gestionará el módulo `dentists`, "habilitar/deshabilitar profesionales" del PDF).
18. **Tests pendientes (confirmado)**: por decisión del equipo, los tests nuevos de gestión de usuarios, servicios y endurecimiento del login (unitarios, integración y E2E) se escribirán al final del proyecto. Los existentes siguen en verde.
19. **Login endurecido**: 10 intentos por minuto e IP en login y registro (`AUTH_THROTTLE_LIMIT`); el login tarda lo mismo exista o no el email; contraseñas de 8 a 72 caracteres (límite de bcrypt). En el frontend, un `401` con token cierra la sesión y lleva al login.
20. **Servicios**: duración entera de 1 a 480 minutos; nombre único sin distinguir mayúsculas; precio referencial opcional con hasta 2 decimales. Un servicio deshabilitado no aparece para PACIENTE/ODONTOLOGO (su detalle responde `404`) y conserva las citas existentes. El seed carga los 5 ejemplos del PDF.
21. **Moneda**: los precios se muestran en bolivianos (`Bs`), deducido de los teléfonos `+591` del proyecto; se cambia en `frontend/src/shared/lib/formato.ts`.
22. **Odontólogos**: acepta nuevas citas solo si está habilitado como profesional (`Dentist.activo`) **y** su cuenta también (`User.activo`); si no, desaparece para pacientes (su detalle responde `404`) pero conserva su historial. `POST /dentists` crea cuenta, perfil y servicios en una sola operación atómica; `POST /users` con rol ODONTOLOGO sigue existiendo, pero sin servicios. Se pueden asignar servicios deshabilitados (el paciente no los ve hasta que se habiliten). El seed agrega a la Dra. Laura Gómez y al Dr. Carlos Rojas (`ortodoncista@clinica.com` / `Odontologo12345`) con sus servicios.
23. **Horarios y bloques**: `PUT /dentists/:id/availability` admite hasta 100 tramos y, con la lista vacía, deja al odontólogo sin horarios. Los bloques vigentes se devuelven ordenados por inicio, y su `motivo` solo lo ve el ADMIN: es texto libre sobre la ausencia de un odontólogo y el registro de pacientes es público. Se permiten bloques que ya empezaron y bloques que se solapan entre sí. Cualquier cita que no esté `CANCELADA`, incluso `FINALIZADA`, impide bloquear su horario. El `motivo` admite hasta 200 caracteres y las fechas deben indicar su zona horaria (`Z` o `-04:00`). Crear un bloque y reemplazar horarios toman el mismo bloqueo del odontólogo que las reservas, para no cruzarse con una reserva en curso.
24. **Citas (T3 a T6)**: `GET /appointments` va de la más reciente a la más antigua y filtra por el inicio de la cita. `limit` por encima de 100 responde `400`. Una transición que existe pero que el rol no puede hacer responde `403`; una que no existe, `409`. Las fechas con año fuera de 1000 a 2999 se rechazan. `upcoming` no incluye una cita que ya empezó aunque siga `EN_ATENCION`; sí aparece en la agenda del día.
25. **Pantallas (F1 a F5)**: el listado de Mis citas se entregó con la reserva porque el E2E 01 termina verificando la cita ahí. Al reprogramar, la lista de horarios sale de `/slots`, que no excluye la propia cita: el backend acepta mover una cita a un horario que se cruza con el suyo, pero la pantalla no lo ofrece. Los datos del servidor usan hooks simples (`useCarga`), sin TanStack Query.
