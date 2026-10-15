# Convenciones del backend (NestJS + Prisma)

Reglas de estilo y de trabajo que aplican a todo el código del backend. Si algo no está aquí, se sigue la guía oficial de NestJS.

---

## 1. Idioma

- **Identificadores técnicos: inglés.** Archivos, carpetas, clases, métodos, DTOs, claves técnicas de los modelos (`id`, `userId`, `createdAt`, `passwordHash`), nombres de modelos Prisma (`Appointment`, `Dentist`). `appointments.service.ts`, `findByPatient()`, `dentistId`.
- **Atributos de negocio: español, con el nombre del PDF.** Campos de los modelos y de los tipos de dominio: `nombre`, `apellido`, `telefono`, `especialidad`, `duracionMin`, `precioReferencial`, `activo`, `horaInicio`, `horaFin`, `estado`, `diaSemana`, `minutoInicio`, `texto`. Así el docente reconoce cada campo del PDF en el código y en la API.
- **Valores de enums de negocio: español exacto del PDF.** Estados: `PENDIENTE`, `CONFIRMADA`, `EN_ATENCION`, `FINALIZADA`, `CANCELADA`; roles: `PACIENTE`, `ODONTOLOGO`, `ADMIN`. Mensajes de error que llegan al usuario: español.
- **Comentarios y documentación: español.**
- Nombres de tests (`describe`/`it`): español, describiendo la regla, no el método. Ejemplo: `it('rechaza una cita que se solapa parcialmente con otra activa del mismo odontólogo')`.

## 2. Nombres de archivos y carpetas

- `kebab-case` para archivos: `create-appointment.dto.ts`, `appointment-status.ts`.
- Sufijo por rol del archivo: `.module.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`, `.dto.ts`, `.guard.ts`, `.decorator.ts`, `.filter.ts`, `.strategy.ts`, `.spec.ts` (unitario, junto al archivo probado), `.int-spec.ts` (integración, en `test/integration/`).
- Carpetas de módulo en plural dentro de `src/modules/`: `appointments/`, `dentists/`, `services/`.
- Dominio puro dentro de `domain/` en cada módulo; nunca importa de `@nestjs/*` ni de `@prisma/client`.

## 3. TypeScript

- `strict: true`. Prohibido `any`; usar `unknown` y estrechar.
- Preferir `type` para formas de datos y `interface` para contratos que se implementan (repositories).
- Enums de negocio como `enum` de Prisma **y** como union de literales en el dominio (`src/common/types/role.ts` declara `Role`; cada módulo declara los suyos, p. ej. `AppointmentStatus`). Son estructuralmente compatibles, así que el repository no necesita conversión, pero el dominio nunca importa `@prisma/client`.
- Fechas: en el dominio se trabaja con `Date` en UTC. Se usa `date-fns` (y `date-fns-tz` para la zona de la clínica). Nunca `moment`.
- No lógica en constructores. No getters con efectos.

## 4. NestJS

- Un módulo por agregado. Un módulo solo exporta su `service`; nadie importa el repository de otro módulo.
- Controllers delgados: parsear, validar, delegar, responder. Sin `try/catch` de negocio (lo hace el filtro global).
- DTOs con `class-validator` + `class-transformer`. `ValidationPipe` global con `whitelist: true, forbidNonWhitelisted: true, transform: true`.
- El cliente **nunca** envía `horaFin`, `estado` inicial ni `patientId` al crear una cita: se derivan en el servidor.
- Inyección por constructor. Sin `@Inject()` manual salvo tokens de interfaz.
- Guards: `JwtAuthGuard` registrado como `APP_GUARD` global; `@Public()` para excepciones; `RolesGuard` + `@Roles()`.
- Decorador `@CurrentUser()` para obtener `{ userId, role }`. Prohibido leer `req.user` a mano en services.

## 5. Errores

- Excepciones de dominio en `src/common/errors/`: `DomainError` base y derivadas con nombre de la regla:
  `ServicioDeshabilitadoError`, `OdontologoDeshabilitadoError`, `OdontologoNoRealizaServicioError`, `HorarioNoDisponibleError`, `HorarioEnElPasadoError`, `TransicionDeEstadoInvalidaError`, `CitaNoModificableError`, `AccesoDenegadoACitaError`.
- Un filtro global mapea cada `DomainError` a un código HTTP:
  - validación de entrada → `400`
  - no autenticado → `401`
  - autenticado pero sin permiso / no es dueño → `403`
  - recurso inexistente → `404`
  - conflicto de negocio (solapamiento, transición inválida, servicio deshabilitado) → `409`
- Formato de error uniforme: `{ statusCode, error, message, details? }`. `message` siempre en español y comprensible para el usuario final.
- Prohibido lanzar `HttpException` desde services o dominio. Solo `DomainError`.

## 6. Prisma

- `schema.prisma` es la única fuente de verdad del esquema. Nunca se modifica la BD a mano fuera de migraciones.
- Nombres de modelos en `PascalCase` singular (`Appointment`), campos en `camelCase`.
- Índices explícitos para consultas frecuentes: `(dentistId, horaInicio)`, `(patientId, horaInicio)`.
- Solo los `*.repository.ts` importan `PrismaService`.
- Operaciones multi-fila siempre dentro de `$transaction`. Ver skill `prisma-migraciones` y la sección 5 de `ARQUITECTURA.md`.

## 7. Tests

- Patrón **AAA** (Arrange, Act, Assert) con líneas en blanco separando las tres partes.
- Un `it` prueba una sola regla. Casos positivos y negativos para cada regla.
- Unitarios: sin BD, sin red. Los repositories se mockean con `jest.fn()` o fakes en memoria. El dominio se prueba sin ningún mock.
- Integración: BD PostgreSQL real de test. `resetDb()` (`test/helpers/db.ts`) trunca todas las tablas en `beforeEach`. Factories de `test/helpers/factories.ts` (`crearPaciente`, `crearOdontologo`, `crearAdmin`, ...) crean filas con valores por defecto sensatos; `loginComo()` y `ruta()` de `test/helpers/auth.ts` obtienen el token real y arman la URL con el prefijo `/api/v1`.
- Asserts específicos: `toEqual`, `toThrow(HorarioNoDisponibleError)`, `expect(res.status).toBe(409)`. Prohibido `toBeTruthy()` como único assert.
- Cobertura mínima exigida por CI: 90% en `domain/` y services; el resto sin umbral obligatorio.
- Comandos canónicos: `npm run test` (unit), `npm run test:int` (integración; aplica migraciones a la BD de test automáticamente), `npm run test:all`, `npm run test:cov`. Con `AI_AGENT` en el entorno Jest compacta la salida; para ver cada test: `env -u AI_AGENT -u CLAUDECODE npm run test -- --verbose`.

## 8. Git

La guía completa (ramas, formato exacto de commits con tipos y ámbitos permitidos, pull requests, hooks) está en `../CONTRIBUTING.md`. Resumen:

- Rama principal `main`, solo por pull request. Ramas de trabajo `feat/<tema>`, `fix/<tema>`, `refactor/<tema>`, `test/<tema>`, `docs/<tema>`, `chore/<tema>`.
- Commits en formato **Conventional Commits**, validados por commitlint en el hook `commit-msg`: `tipo(ámbito): descripción` con tipo en inglés, ámbito de la lista de `../commitlint.config.mjs` (`auth`, `users`, `appointments`, `availability`, `prisma`, `common`...), descripción en español en minúscula, sin punto final, máximo 72 caracteres:
  `feat(appointments): reprogramar cita liberando el horario anterior`
  `test(availability): RED - cubrir cálculo de slots con bloques no disponibles`
- El hook `pre-commit` corre ESLint y Prettier sobre los archivos en stage; un error de lint cancela el commit.
- **Commits atómicos**: un commit hace una sola cosa lógica. Con TDD, cada paso puede ser un commit (`test(...): RED - ...`, `feat(...): GREEN - ...`, `refactor(...): ...`). Tamaño objetivo 100 a 300 líneas; más de 1000 se parte.
- **Separar refactor de funcionalidad** y formato de comportamiento: nunca en el mismo commit. Pequeñas limpiezas (renombrar una variable) pueden ir con la feature.
- El cuerpo del commit explica el **por qué**, no lo que ya se ve en el diff.
- Un commit no rompe los tests (salvo los `RED` del ciclo TDD). Antes de commitear: `npm run lint && npm run test`.
- `main` siempre en verde y desplegable; ramas de trabajo cortas (días, no semanas) para no acumular conflictos.
- Nunca commitear `.env`. Sí `.env.example`.

## 9. Formato y lint

- ESLint 9 (flat config en `eslint.config.mjs`: `@eslint/js` recommended + `typescript-eslint` recommendedTypeChecked + `eslint-plugin-prettier`) y Prettier (`.prettierrc`: 2 espacios, comillas simples, punto y coma, `printWidth: 100`, trailing commas `all`). `no-explicit-any` es error en `src/` y está apagado solo en tests.
- Comandos: `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check`.
- Imports ordenados: Node → externos → internos relativos (el backend no usa alias).
- Sin `console.log` en código de producción; usar el `Logger` de Nest.

## 10. Documentación

- Cada módulo tiene un comentario de cabecera en su `*.module.ts` con una frase sobre su responsabilidad.
- Swagger (`@nestjs/swagger`) en `/api/docs` para que el docente explore la API. Todo DTO lleva `@ApiProperty`.
- `README.md` del backend con: requisitos, cómo levantar la BD, cómo migrar y seedear, cómo correr cada tipo de test. Debe poder seguirse en la evaluación sin ayuda.
