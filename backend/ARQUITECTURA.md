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
│       ├── auth/                    # registro, login, JwtStrategy                    (hecho)
│       ├── users/                   # usuario base + perfiles, gestión ADMIN, mi cuenta (hecho)
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

```mermaid
erDiagram
    User ||--o| Patient : "es"
    User ||--o| Dentist : "es"
    Patient ||--o{ Appointment : "reserva"
    Dentist ||--o{ Appointment : "atiende"
    Service ||--o{ Appointment : "se presta en"
    Dentist ||--o{ DentistService : "realiza"
    Service ||--o{ DentistService : "lo realizan"
    Dentist ||--o{ AvailabilityRule : "atiende en"
    Dentist ||--o{ UnavailableBlock : "no atiende en"
    Appointment ||--o| Observation : "registra"
```

| Modelo             | Campos clave                                                                                   | Notas                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `User`             | id, email (único), passwordHash, role (`PACIENTE` / `ODONTOLOGO` / `ADMIN`), activo, createdAt | Usuario base para login. `activo = false` impide iniciar sesión.                                                        |
| `Patient`          | id, userId (1:1), nombre, apellido, telefono (opcional)                                        | Datos básicos que ve el odontólogo en su agenda.                                                                        |
| `Dentist`          | id, userId (1:1), nombre, especialidad, activo                                                 | Deshabilitado = no acepta nuevas citas, conserva historial.                                                             |
| `Service`          | id, nombre (único), descripcion, duracionMin (>0), precioReferencial (opcional), activo        | Deshabilitado = no disponible para nuevas reservas.                                                                     |
| `DentistService`   | dentistId, serviceId                                                                           | Tabla puente: qué servicios realiza cada odontólogo.                                                                    |
| `AvailabilityRule` | id, dentistId, diaSemana (0 = domingo … 6 = sábado), minutoInicio, minutoFin                   | Horario recurrente de atención en minutos desde las 00:00 de la zona de la clínica (09:00 = 540).                       |
| `UnavailableBlock` | id, dentistId, inicio (timestamptz), fin (timestamptz), motivo (opcional)                      | Pausas/bloqueos puntuales.                                                                                              |
| `Appointment`      | id, patientId, dentistId, serviceId, horaInicio, horaFin, estado, createdAt, updatedAt         | `horaFin` se calcula en el dominio, nunca la manda el cliente. La "fecha" del PDF es la parte de fecha de `horaInicio`. |
| `Observation`      | id, appointmentId (1:1), texto, createdAt                                                      | Registrada por el odontólogo al finalizar.                                                                              |

Decisiones de modelado:

- Identificadores técnicos en inglés (`id`, `userId`, `createdAt`, nombres de modelos); atributos de negocio con el nombre del PDF en español (`nombre`, `especialidad`, `duracionMin`, `horaInicio`, `estado`, `activo`). Ver `CONVENCIONES.md` sección 1.
- `horaInicio` y `horaFin` se guardan como `timestamptz` en **UTC**. La zona horaria de la clínica se configura por variable de entorno (`CLINIC_TIMEZONE`, `America/La_Paz` por defecto) y se usa para convertir los horarios de atención (minutos de reloj) a instantes reales.
- Intervalos semiabiertos `[horaInicio, horaFin)`: una cita que termina a las 10:00 y otra que empieza a las 10:00 **no** se solapan (regla "permitir citas consecutivas").
- Una cita `CANCELADA` no bloquea horario. El constraint de exclusión y la consulta de solapamiento excluyen ese estado.
- Horario partido: dos filas de `AvailabilityRule` (08:00-12:00 y 14:00-18:00), no un campo de pausa. Las pausas puntuales son `UnavailableBlock`.
- Sin borrado en cascada: todas las claves foráneas son `RESTRICT`, para conservar el historial. Odontólogos y servicios se deshabilitan con `activo`, no se borran.
- Reprogramar actualiza la misma fila de `Appointment`. Como el constraint se evalúa en ese `UPDATE`, si el horario nuevo está ocupado la cita conserva el anterior (PDF sección 8).

Restricciones en PostgreSQL (SQL manual en las migraciones, protegidas por `test/integration/esquema.int-spec.ts`):

| Constraint                                                | Regla                                                                         |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `appointment_no_overlap`                                  | Dos citas no `CANCELADA` del mismo odontólogo no se solapan.                  |
| `appointment_rango_valido`                                | `horaInicio < horaFin`.                                                       |
| `service_duracion_positiva`, `service_precio_no_negativo` | `duracionMin > 0`; `precioReferencial >= 0` si existe.                        |
| `availability_dia_valido`, `availability_minutos_validos` | `diaSemana` de 0 a 6; minutos entre 0 y 1440, con `minutoInicio < minutoFin`. |
| `availability_no_overlap`                                 | Dos tramos del mismo odontólogo y día no se solapan.                          |
| `unavailable_block_rango_valido`                          | `inicio < fin`.                                                               |

Se validan solo en la aplicación, a propósito: que el odontólogo realice el servicio (quitarle un servicio no debe invalidar sus citas históricas), que odontólogo y servicio estén habilitados al reservar (deshabilitarlos no debe afectar citas ya creadas), las transiciones de estado y que el rol de `User` coincida con su perfil.

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

| Transición               | Quién puede                                      |
| ------------------------ | ------------------------------------------------ |
| PENDIENTE → CONFIRMADA   | ADMIN                                            |
| CONFIRMADA → EN_ATENCION | ODONTOLOGO (dueño de la cita)                    |
| EN_ATENCION → FINALIZADA | ODONTOLOGO (dueño de la cita); exige observación |
| PENDIENTE → CANCELADA    | PACIENTE (dueño), ADMIN                          |
| CONFIRMADA → CANCELADA   | PACIENTE (dueño), ADMIN                          |

Todo lo demás es inválido y devuelve `409 Conflict`. En particular: FINALIZADA no se cancela ni vuelve a PENDIENTE; CANCELADA es terminal. Reprogramar solo se permite desde PENDIENTE o CONFIRMADA.

> **Confirmado:** EN_ATENCION → CANCELADA no se permite, tampoco para el ADMIN. **Pendiente de confirmar:** si el ODONTOLOGO puede confirmar sus propias citas PENDIENTE (por defecto solo ADMIN, porque el PDF asigna "confirmar o cancelar citas" al administrador).

La máquina de estados es una tabla en `domain/appointment-status.ts` y se prueba unitariamente con todos los casos positivos y negativos.

---

## 7. Seguridad

- **Autenticación**: `POST /auth/register` (solo crea PACIENTE; el DTO rechaza cualquier campo extra como `role` con 400), `POST /auth/login` devuelve `{ accessToken, user }` (JWT firmado con `JWT_SECRET`, expiración `JWT_EXPIRES_IN`). Odontólogos y admins se crean desde el admin o el seed, nunca por registro público.
- **Passport + `JwtStrategy`** (`modules/auth/jwt.strategy.ts`): valida firma y expiración del Bearer token y adjunta `CurrentUserData = { userId, email, role, patientId?, dentistId? }` a `request.user`. Los ids de perfil viajan en el payload para verificar propiedad sin consultar la BD.
- **`JwtAuthGuard`** registrado como `APP_GUARD` (todas las rutas privadas por defecto) + decorador `@Public()` para register/login y catálogo público.
- **`RolesGuard`** también global + `@Roles('ADMIN')`: autorización por rol.
- **`PasswordHasher`** (`common/security/`): envoltorio inyectable de bcrypt (coste configurable para tests). Vive en `common` porque lo usan `auth` (registro, login) y `users` (alta de personal, cambio de contraseña).
- **Cuentas deshabilitadas**: `JwtStrategy` relee el usuario en cada petición; si un ADMIN lo deshabilitó (o ya no existe) responde `401` al instante, sin esperar a que expire el token. Un ADMIN no puede deshabilitar su propia cuenta (`409`).
- **Login endurecido**: `ThrottlerGuard` limita `POST /auth/login` y `/auth/register` a `AUTH_THROTTLE_LIMIT` intentos por minuto e IP (10 por defecto; `429` en español; desactivado con `NODE_ENV=test`). El login siempre ejecuta bcrypt (contra un hash de relleno si el email no existe) para no revelar por tiempo qué cuentas existen. Las contraseñas aceptan de 8 a 72 caracteres (límite de bcrypt).
- **Frontend**: cualquier `401` con token (vencido o cuenta deshabilitada) borra la sesión y lleva al login con el aviso "Tu sesión expiró".
- **Verificación de propiedad en el service**: `GET /appointments/:id` comprueba que `patientId` corresponde al usuario autenticado (o que es el odontólogo asignado, o ADMIN). Devuelve `403`, no `404`, cuando la cita existe pero no es suya (criterio E2E 07).
- Contraseñas con `bcrypt`. Nunca se devuelve `passwordHash`.
- CORS restringido al origen del frontend (`FRONTEND_URL`).

---

## 8. API REST (contrato de alto nivel)

Prefijo `/api/v1`. Respuestas JSON. Errores con formato uniforme `{ statusCode, error, message, details? }`.

| Recurso           | Endpoints                                                                                                                                                                                                                                                       | Roles                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Auth (hecho)      | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`                                                                                                                                                                                                       | público / público / autenticado                                         |
| Users (hecho)     | `GET /users`, `POST /users` (crea ODONTOLOGO o ADMIN), `GET /users/:id`, `PATCH /users/:id` (email y perfil; el rol no cambia), `PATCH /users/:id/estado` (`{ activo }`, no la propia)                                                                          | ADMIN                                                                   |
| Mi cuenta (hecho) | `GET /users/me`, `PATCH /users/me` (PACIENTE: nombre, apellido, teléfono; ODONTOLOGO: nombre), `PATCH /users/me/password` (`{ passwordActual, passwordNueva }`, 204)                                                                                            | autenticado                                                             |
| Services (hecho)  | `GET /services` y `GET /services/:id` (no-admin: solo habilitados, deshabilitado = 404), `POST /services`, `PATCH /services/:id`, `PATCH /services/:id/estado`                                                                                                  | lectura: todos; escritura: ADMIN                                        |
| Dentists (hecho)  | `GET /dentists?serviceId=` y `GET /dentists/:id` (no-admin: solo los que aceptan citas, sin email; deshabilitado = 404), `POST /dentists` (crea cuenta + perfil + servicios), `PATCH /dentists/:id`, `PATCH /dentists/:id/estado`, `PUT /dentists/:id/services` | lectura: todos; escritura: ADMIN                                        |
| Horarios (hecho)  | `GET /dentists/:id/availability` (`{ horarios, bloques }`; no-admin: sin `motivo`, deshabilitado = 404), `PUT /dentists/:id/availability`, `POST /dentists/:id/blocks`, `DELETE /dentists/:id/blocks/:blockId`                                                  | lectura: autenticado; escritura: ADMIN                                  |
| Slots             | `GET /dentists/:id/slots?serviceId=&fecha=`                                                                                                                                                                                                                     | autenticado                                                             |
| Appointments      | `POST /appointments`, `GET /appointments/mine`, `GET /appointments/:id`, `PATCH /appointments/:id/reschedule`, `PATCH /appointments/:id/cancel`, `PATCH /appointments/:id/status`, `GET /appointments` (todas)                                                  | PACIENTE / propietario / ODONTOLOGO / ADMIN según tabla de transiciones |
| Agenda            | `GET /dentists/me/agenda?fecha=`, `GET /dentists/me/agenda/upcoming`                                                                                                                                                                                            | ODONTOLOGO                                                              |
| Observations      | `POST /appointments/:id/observation`                                                                                                                                                                                                                            | ODONTOLOGO dueño                                                        |

El detalle de lo que falta (cuerpos, respuestas, errores y tests de cada endpoint) está en `PLAN.md`.

---

## 9. Estrategia de testing

| Nivel       | Herramienta                           | Qué cubre                                                                                                                                                         | Dónde                                |
| ----------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Unitario    | Jest                                  | Funciones de dominio y services con repositories mockeados. Los 9 puntos de la sección 12 del PDF.                                                                | `src/**/*.spec.ts` (junto al código) |
| Integración | Jest + Supertest + PostgreSQL de test | Endpoints reales con BD real. Los 10 puntos de la sección 13. Incluye prueba de doble reserva concurrente (`Promise.all` de dos POST).                            | `test/integration/*.int-spec.ts`     |
| E2E         | Playwright                            | Vive en el **frontend**, porque el PDF exige que "los E2E interactúen con la interfaz real". El backend solo aporta un script de seed para dejar datos conocidos. | `frontend/e2e/`                      |

La BD de integración es una base PostgreSQL aparte (`.env.test`, puerto 5433), migrada antes de la suite (`test/integration/global-setup.ts`) y truncada antes de cada test (`resetDb`). Nunca se usan mocks de Prisma en integración.

---

## 10. Configuración y entorno

Variables de entorno, validadas al arrancar en `src/config/env.validation.ts` (la app no inicia si falta `DATABASE_URL` o `JWT_SECRET`):

```
# backend/.env (desarrollo) — ver .env.example
DATABASE_URL=postgresql://dental:...@localhost:5434/dental
JWT_SECRET=
JWT_EXPIRES_IN=8h
AUTH_THROTTLE_LIMIT=10   # opcional: intentos por minuto e IP en login y registro
PORT=3000
FRONTEND_URL=http://localhost:5173

# backend/.env.test (integración) — ver .env.test.example
DATABASE_URL=postgresql://dental:...@localhost:5433/dental_test
JWT_SECRET=
JWT_EXPIRES_IN=1h

# Zona horaria de la clínica (IANA), usada para interpretar los horarios de atención:
CLINIC_TIMEZONE=America/La_Paz
```

El `compose.yml` de la raíz levanta las dos bases (desarrollo en 5434, test en 5433 sobre `tmpfs`) con un solo comando, de modo que el docente pueda ejecutar toda la suite.
