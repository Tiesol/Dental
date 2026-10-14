# Arquitectura del backend — Sistema de Citas para Clínica Dental

Stack decidido: **NestJS + TypeScript**, **PostgreSQL + Prisma**, **JWT con Passport**, tests con **Jest + Supertest**.

Este documento describe cómo se organiza el backend y por qué. Es la referencia que todo código nuevo debe respetar. Las reglas de negocio en sí están en el skill `reglas-de-negocio-citas`.

---

## 1. Principios

1. **Las reglas de negocio viven en código puro, sin Nest ni Prisma.** Cálculo de hora de fin, detección de solapamiento, transiciones de estado y cálculo de slots disponibles son funciones/clases de dominio que se prueban con tests unitarios sin base de datos ni mocks pesados. Esto responde directamente al criterio del docente: "los unitarios prueban reglas reales".
2. **Un módulo Nest por agregado de negocio.** Cada módulo tiene su controller, service, repository y DTOs. Nada de lógica en controllers.
3. **La base de datos es la última línea de defensa.** La prevención de dobles reservas se hace en la aplicación (transacción + bloqueo) **y** en PostgreSQL (constraint de exclusión). Si una falla, la otra sostiene la regla.
4. **Toda ruta privada pasa por autenticación y autorización por rol.** Y además por verificación de propiedad (un paciente solo ve sus citas; un odontólogo solo su agenda).
5. **El backend nunca confía en el frontend.** Toda validación (campos, fechas, disponibilidad) se repite en el servidor aunque el frontend ya la haya hecho.

---

## 2. Estilo arquitectónico

Monolito modular con capas por módulo (variante ligera de arquitectura hexagonal):

```
HTTP (controller + DTOs + guards)
        │
        ▼
Aplicación (service: casos de uso, orquesta transacciones)
        │
        ▼
Dominio (reglas puras: entidades, value objects, funciones de cálculo)
        │
        ▼
Infraestructura (repository sobre Prisma)
```

- **Controller**: recibe la petición, valida el DTO (class-validator), aplica guards y delega al service. No contiene `if` de negocio.
- **Service (caso de uso)**: coordina. Carga datos vía repository, invoca el dominio, persiste. Abre transacciones cuando una operación toca varias filas (reservar, reprogramar).
- **Dominio**: funciones puras y clases sin dependencias de framework. Ejemplo: `calcularHoraFin(inicio, duracionMin)`, `seSolapan(a, b)`, `MaquinaEstadosCita.puedeTransicionar(desde, hacia)`, `calcularSlotsDisponibles(...)`.
- **Repository**: único lugar que importa `PrismaService`. Devuelve objetos de dominio o tipos planos, nunca expone el cliente Prisma hacia arriba.

---

## 3. Estructura de carpetas

```
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/                  # la migración inicial incluye el constraint anti-solapamiento
│   └── seed.ts                      # datos mínimos para desarrollo y E2E
├── src/
│   ├── main.ts                      # bootstrap + Swagger en /api/docs
│   ├── app.module.ts                # módulos + guards globales (APP_GUARD)
│   ├── app.setup.ts                 # prefijo /api/v1, ValidationPipe, filtro de errores, CORS (compartido con tests)
│   ├── common/                      # transversal, sin negocio
│   │   ├── decorators/              # @Roles(), @CurrentUser(), @Public()
│   │   ├── guards/                  # JwtAuthGuard (Passport), RolesGuard
│   │   ├── filters/                 # DomainErrorFilter -> formato uniforme
│   │   ├── errors/                  # DomainError y derivadas
│   │   └── types/                   # Role, CurrentUserData
│   ├── config/                      # validación de variables de entorno (env.validation.ts)
│   ├── prisma/                      # PrismaModule + PrismaService
│   └── modules/
│       ├── auth/                    # registro, login, JwtStrategy, PasswordHasher   (hecho)
│       ├── users/                   # usuario base + rol + perfiles                  (hecho)
│       ├── dentists/                # odontólogos + servicios que realizan
│       ├── services/                # servicios dentales (catálogo)
│       ├── availability/            # horarios de atención + bloques no disponibles + cálculo de slots
│       ├── appointments/            # citas: reservar, reprogramar, cancelar, cambiar estado
│       └── observations/            # observación de atención (registro al finalizar)
└── test/
    ├── integration/                 # *.int-spec.ts: Supertest contra la app real + Postgres de test
    │   └── global-setup.ts          # aplica migraciones a la BD de test
    └── helpers/                     # app.ts, db.ts (resetDb), factories.ts, auth.ts (loginComo, ruta)
```

Los tests unitarios van **junto al código** que prueban (`*.spec.ts` en `src/`), como hace NestJS por defecto; solo el dominio y los services se prueban unitariamente.

Estructura interna de cada módulo (ejemplo `appointments`):

```
appointments/
├── appointments.module.ts
├── appointments.controller.ts
├── appointments.service.ts          # casos de uso
├── appointments.service.spec.ts     # unitario con repositories mockeados
├── appointments.repository.ts       # acceso a Prisma
├── domain/
│   ├── appointment.ts               # tipos de dominio de la cita
│   ├── appointment-status.ts        # máquina de estados
│   ├── appointment-status.spec.ts
│   ├── overlap.ts                   # seSolapan(), hayConflicto()
│   ├── overlap.spec.ts
│   ├── end-time.ts                  # calcularHoraFin()
│   └── end-time.spec.ts
└── dto/
    ├── create-appointment.dto.ts
    ├── reschedule-appointment.dto.ts
    └── change-status.dto.ts
```

---

## 4. Modelo de datos (Prisma / PostgreSQL)

Entidades mínimas exigidas por el PDF (sección 11, "Persistencia"): usuarios, pacientes, odontólogos, servicios, disponibilidad, citas y observaciones.

Es exactamente lo que hay en `prisma/schema.prisma`:

| Modelo | Campos clave | Notas |
|---|---|---|
| `User` | id, email (único), passwordHash, role (`PACIENTE` / `ODONTOLOGO` / `ADMIN`), activo, createdAt | Usuario base para login. `activo = false` impide iniciar sesión. |
| `Patient` | id, userId (1:1), nombre, apellido, telefono (opcional) | Datos básicos que ve el odontólogo en su agenda. |
| `Dentist` | id, userId (1:1), nombre, especialidad, activo | Deshabilitado = no acepta nuevas citas, conserva historial. |
| `Service` | id, nombre (único), descripcion, duracionMin (>0), precioReferencial (opcional), activo | Deshabilitado = no disponible para nuevas reservas. |
| `DentistService` | dentistId, serviceId | Tabla puente: qué servicios realiza cada odontólogo. |
| `AvailabilityRule` | id, dentistId, diaSemana (0 = domingo … 6 = sábado), minutoInicio, minutoFin | Horario recurrente de atención en minutos desde las 00:00 de la zona de la clínica (09:00 = 540). |
| `UnavailableBlock` | id, dentistId, inicio (timestamptz), fin (timestamptz), motivo (opcional) | Pausas/bloqueos puntuales. |
| `Appointment` | id, patientId, dentistId, serviceId, horaInicio, horaFin, estado, createdAt, updatedAt | `horaFin` se calcula en el dominio, nunca la manda el cliente. La "fecha" del PDF es la parte de fecha de `horaInicio`. |
| `Observation` | id, appointmentId (1:1), texto, createdAt | Registrada por el odontólogo al finalizar. |

Decisiones de modelado:

- Identificadores técnicos en inglés (`id`, `userId`, `createdAt`, nombres de modelos); atributos de negocio con el nombre del PDF en español (`nombre`, `especialidad`, `duracionMin`, `horaInicio`, `estado`, `activo`). Ver `CONVENCIONES.md` sección 1.
- `horaInicio` y `horaFin` se guardan como `timestamptz` en **UTC**. La zona horaria de la clínica se configura por variable de entorno (`CLINIC_TIMEZONE`, pendiente de definir) y se usa para convertir los horarios de atención (minutos de reloj) a instantes reales.
- Intervalos semiabiertos `[horaInicio, horaFin)`: una cita que termina a las 10:00 y otra que empieza a las 10:00 **no** se solapan (regla "permitir citas consecutivas").
- Una cita `CANCELADA` no bloquea horario. El constraint de exclusión y la consulta de solapamiento excluyen ese estado.

---

## 5. Prevención de dobles reservas (consistencia bajo concurrencia)

Es el requisito más sensible del PDF ("evitar dobles reservas aun cuando dos solicitudes intenten tomar el mismo horario casi simultáneamente"). Se implementa en **dos capas**:

**Capa aplicación (Prisma interactive transaction):**

1. Abrir transacción (`prisma.$transaction(async (tx) => { ... })`).
2. Bloquear la fila del odontólogo con `SELECT ... FOR UPDATE` (vía `tx.$queryRaw`). Esto serializa todas las reservas del mismo odontólogo: la segunda petición espera a que la primera termine.
3. Dentro de la transacción, recalcular disponibilidad: servicio activo, odontólogo activo y realiza el servicio, slot dentro del horario de atención, fuera de bloques, no en el pasado, sin solapamiento con citas activas.
4. Insertar la cita. Si cualquier validación falla, lanzar excepción de dominio y la transacción hace rollback.

**Capa base de datos (migración SQL manual):**

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_no_overlap
  EXCLUDE USING gist (
    "dentistId" WITH =,
    tstzrange("horaInicio", "horaFin", '[)') WITH &&
  )
  WHERE ("estado" <> 'CANCELADA');
```

Prisma no modela constraints de exclusión en `schema.prisma`, así que esta sentencia se agrega a mano en el archivo de la migración correspondiente (ver skill `prisma-migraciones`). Si la BD rechaza la inserción, el repository traduce el error a la misma excepción de dominio `HorarioNoDisponibleError`.

**Reprogramación:** se hace en la misma transacción: primero se valida y asegura el nuevo horario; solo si eso tiene éxito se libera el anterior. Nunca al revés (regla del PDF sección 8).

---

## 6. Estados de la cita y transiciones

```
PENDIENTE ──> CONFIRMADA ──> EN_ATENCION ──> FINALIZADA
    │              │
    └──────────────┴──────────> CANCELADA
```

| Transición | Quién puede |
|---|---|
| PENDIENTE → CONFIRMADA | ADMIN |
| CONFIRMADA → EN_ATENCION | ODONTOLOGO (dueño de la cita) |
| EN_ATENCION → FINALIZADA | ODONTOLOGO (dueño de la cita); exige observación |
| PENDIENTE → CANCELADA | PACIENTE (dueño), ADMIN |
| CONFIRMADA → CANCELADA | PACIENTE (dueño), ADMIN |

Todo lo demás es inválido y devuelve `409 Conflict`. En particular: FINALIZADA no se cancela ni vuelve a PENDIENTE; CANCELADA es terminal. Reprogramar solo se permite desde PENDIENTE o CONFIRMADA.

> **Pendiente de confirmar con el usuario:** (a) si EN_ATENCION → CANCELADA debe permitirse para el ADMIN (por defecto **no**); (b) si el ODONTOLOGO puede confirmar sus propias citas PENDIENTE (por defecto solo ADMIN, porque el PDF asigna "confirmar o cancelar citas" al administrador).

La máquina de estados es una tabla en `domain/appointment-status.ts` y se prueba unitariamente con todos los casos positivos y negativos.

---

## 7. Seguridad

- **Autenticación**: `POST /auth/register` (solo crea PACIENTE; el DTO rechaza cualquier campo extra como `role` con 400), `POST /auth/login` devuelve `{ accessToken, user }` (JWT firmado con `JWT_SECRET`, expiración `JWT_EXPIRES_IN`). Odontólogos y admins se crean desde el admin o el seed, nunca por registro público.
- **Passport + `JwtStrategy`** (`modules/auth/jwt.strategy.ts`): valida firma y expiración del Bearer token y adjunta `CurrentUserData = { userId, email, role, patientId?, dentistId? }` a `request.user`. Los ids de perfil viajan en el payload para verificar propiedad sin consultar la BD.
- **`JwtAuthGuard`** registrado como `APP_GUARD` (todas las rutas privadas por defecto) + decorador `@Public()` para register/login y catálogo público.
- **`RolesGuard`** también global + `@Roles('ADMIN')`: autorización por rol.
- **`PasswordHasher`**: envoltorio inyectable de bcrypt (coste configurable para tests).
- **Verificación de propiedad en el service**: `GET /appointments/:id` comprueba que `patientId` corresponde al usuario autenticado (o que es el odontólogo asignado, o ADMIN). Devuelve `403`, no `404`, cuando la cita existe pero no es suya (criterio E2E 07).
- Contraseñas con `bcrypt`. Nunca se devuelve `passwordHash`.
- CORS restringido al origen del frontend (`FRONTEND_URL`).

---

## 8. API REST (contrato de alto nivel)

Prefijo `/api/v1`. Respuestas JSON. Errores con formato uniforme `{ statusCode, error, message, details? }`.

| Recurso | Endpoints | Roles |
|---|---|---|
| Auth (hecho) | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | público / público / autenticado |
| Users (hecho) | `GET /users` | ADMIN |
| Services | `GET /services` (solo activos para no-admin), `POST /services`, `PATCH /services/:id`, `PATCH /services/:id/estado` | lectura: todos; escritura: ADMIN |
| Dentists | `GET /dentists`, `GET /dentists/:id`, `POST /dentists`, `PATCH /dentists/:id`, `PATCH /dentists/:id/estado`, `PUT /dentists/:id/services` | lectura: todos; escritura: ADMIN |
| Availability | `GET /dentists/:id/availability`, `PUT /dentists/:id/availability`, `POST /dentists/:id/blocks`, `DELETE /dentists/:id/blocks/:blockId`, `GET /dentists/:id/slots?serviceId=&fecha=` | escritura: ADMIN; slots: autenticado |
| Appointments | `POST /appointments`, `GET /appointments/mine`, `GET /appointments/:id`, `PATCH /appointments/:id/reschedule`, `PATCH /appointments/:id/cancel`, `PATCH /appointments/:id/status`, `GET /appointments` (todas) | PACIENTE / propietario / ODONTOLOGO / ADMIN según tabla de transiciones |
| Agenda | `GET /dentists/me/agenda?fecha=`, `GET /dentists/me/agenda/upcoming` | ODONTOLOGO |
| Observations | `POST /appointments/:id/observation` | ODONTOLOGO dueño |

Los detalles (DTOs, códigos de error por caso) se definen al implementar cada módulo, siguiendo `CONVENCIONES.md`.

---

## 9. Estrategia de testing

| Nivel | Herramienta | Qué cubre | Dónde |
|---|---|---|---|
| Unitario | Jest | Funciones de dominio y services con repositories mockeados. Los 9 puntos de la sección 12 del PDF. | `src/**/*.spec.ts` (junto al código) |
| Integración | Jest + Supertest + PostgreSQL de test | Endpoints reales con BD real. Los 10 puntos de la sección 13. Incluye prueba de doble reserva concurrente (`Promise.all` de dos POST). | `test/integration/*.int-spec.ts` |
| E2E | Playwright | Vive en el **frontend**, porque el PDF exige que "los E2E interactúen con la interfaz real". El backend solo aporta un script de seed para dejar datos conocidos. | `frontend/e2e/` |

La BD de integración es una base PostgreSQL aparte (`.env.test`, puerto 5433), migrada antes de la suite (`test/integration/global-setup.ts`) y truncada antes de cada test (`resetDb`). Nunca se usan mocks de Prisma en integración.

---

## 10. Configuración y entorno

Variables de entorno, validadas al arrancar en `src/config/env.validation.ts` (la app no inicia si falta `DATABASE_URL` o `JWT_SECRET`):

```
# backend/.env (desarrollo) — ver .env.example
DATABASE_URL=postgresql://dental:...@localhost:5434/dental
JWT_SECRET=
JWT_EXPIRES_IN=8h
PORT=3000
FRONTEND_URL=http://localhost:5173

# backend/.env.test (integración) — ver .env.test.example
DATABASE_URL=postgresql://dental:...@localhost:5433/dental_test
JWT_SECRET=
JWT_EXPIRES_IN=1h

# pendiente de definir con el usuario, se agregará cuando se implemente availability:
CLINIC_TIMEZONE=
```

El `compose.yml` de la raíz levanta las dos bases (desarrollo en 5434, test en 5433 sobre `tmpfs`) con un solo comando, de modo que el docente pueda ejecutar toda la suite.
