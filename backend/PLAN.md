# Plan del backend: lo que falta, por tareas

Divide lo pendiente en tareas con sus endpoints, para desarrollar cada una en un chat o rama distinta. Complementa a `ARQUITECTURA.md` (cómo se construye) y al skill `reglas-de-negocio-citas` (qué es válido); si hay contradicción, gana el skill.

Al terminar una tarea: marcarla como hecha en esta tabla y agregar `(hecho)` a su fila en `ARQUITECTURA.md` sección 8.

## Estado y orden

| Tarea | Qué entrega                                                 | Módulo         | Empezar después de | Estado    |
| ----- | ----------------------------------------------------------- | -------------- | ------------------ | --------- |
| T1    | Horarios de atención y bloques no disponibles (4 endpoints) | `availability` | —                  | Hecho     |
| T2    | Cálculo de horarios disponibles (1 endpoint)                | `availability` | T1                 | Hecho     |
| T3    | Reservar y consultar citas (4 endpoints)                    | `appointments` | T2                 | Hecho     |
| T4    | Reprogramar y cancelar (2 endpoints)                        | `appointments` | T3                 | Hecho     |
| T5    | Estados de la cita y observación (2 endpoints)              | `observations` | T3                 | Hecho     |
| T6    | Agenda del odontólogo (2 endpoints)                         | `appointments` | T3                 | Hecho     |
| T7    | Tests pendientes de lo ya construido                        | varios         | —                  | Hecho     |
| T8    | Entorno para los E2E: seed, reloj fijo, Playwright y CI     | `e2e`          | T3                 | Hecho     |
| F1    | Pantalla de horarios y bloques (ADMIN)                      | frontend       | T1                 | Hecho     |
| F2    | Reserva, con E2E 01 y 02                                    | frontend       | T3, T8             | Pendiente |
| F3    | Mis citas, con E2E 03, 04, 06 y 07                          | frontend       | T4, T8, F2         | Pendiente |
| F4    | Agenda del odontólogo, con E2E 05                           | frontend       | T5, T6, T8         | Pendiente |
| F5    | Todas las citas (ADMIN)                                     | frontend       | T4, T5             | Pendiente |

```
T1 ──> T2 ──> T3 ──┬──> T4
                   ├──> T5
                   ├──> T6
                   └──> T8 ──> F2 ──> F3
                            └──> F4 (además necesita T5 y T6)

T7: en cualquier momento
F1: después de T1
F5: después de T4 y T5
```

**Qué se puede hacer en paralelo:** T7 con cualquiera; T4, T5, T6 y T8 entre sí; F1 desde que termina T1. T1, T2 y T3 van en orden, porque cada una usa el código de la anterior.

## Cómo empezar una tarea en un chat nuevo

Pegar esto, cambiando el número de tarea. La tarea de la que depende ya debe estar en `main`. En las tareas F, cambiar `backend/CLAUDE.md` por `frontend/CLAUDE.md`.

```
Actualiza main, crea la rama que indica la tarea y lee backend/PLAN.md.
Desarrolla la tarea T1, solo esa.
Sigue backend/CLAUDE.md y el skill ciclo-tdd: RED, GREEN y REFACTOR con un commit por paso.
Si encuentras algo que el plan no define, usa el valor por defecto de la sección
"Decisiones" y avísame. Termina cuando se cumpla la Definition of Done.
```

## Decisiones

No están en el PDF. Las marcadas "(confirmado)" ya las decidió el equipo; las demás usan este valor por defecto, que se cambia aquí si se decide otra cosa.

| #   | Tema                                                  | Por defecto                                                                                                           | Tarea |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----- |
| D1  | ¿El ADMIN puede cancelar una cita `EN_ATENCION`?      | No: si ya está en atención no se cancela (confirmado)                                                                 | T4    |
| D2  | ¿El ODONTOLOGO puede confirmar sus citas `PENDIENTE`? | No, solo el ADMIN                                                                                                     | T5    |
| D3  | Cada cuánto se ofrece un horario                      | Cada 15 minutos, en una constante `PASO_SLOTS_MIN`. El PDF no lo fija: solo exige considerar la duración del servicio | T2    |
| D4  | Estado de la cita al reprogramarla                    | Conserva su estado: `CONFIRMADA` sigue confirmada y `PENDIENTE` sigue pendiente (confirmado)                          | T4    |
| D5  | Segunda observación sobre la misma cita               | Se rechaza con `409`                                                                                                  | T5    |
| D6  | Cambiar un horario con citas ya creadas fuera de él   | Se permite; las citas se conservan                                                                                    | T1    |
| D7  | Conversión entre zona de la clínica y UTC             | `date-fns` + `date-fns-tz`, verificando su API en `node_modules`                                                      | T2    |
| D8  | Citas `CANCELADA` en la agenda del odontólogo         | No se muestran                                                                                                        | T6    |

## Reglas para todas las tareas

- **Rutas:** prefijo `/api/v1`. Todas requieren JWT. "Autenticado" significa cualquier rol.
- **Errores:** formato `{ statusCode, error, message, details? }`, con `message` en español. Los services lanzan solo `DomainError`, y los errores nuevos se agregan a `src/common/errors/domain-error.ts`.
- **Hora actual:** siempre con `Clock` (`src/common/time/clock.ts`), nunca con `new Date()`, para que los tests puedan fijarla.
- **Fechas:** ISO 8601 en UTC en la API. El parámetro `fecha` es `YYYY-MM-DD` en la zona de la clínica (`CLINIC_TIMEZONE`). El día de la semana se calcula en esa zona, no en la del servidor.
- **Intervalos:** semiabiertos `[inicio, fin)`, de modo que dos citas consecutivas no se solapan.
- **Contrato:** el cliente nunca envía `horaFin`, `estado` ni `patientId`.
- **Frontend:** si cambia un DTO ya consumido, actualizar `frontend/src/api/types.ts` en el mismo cambio.
- **Ya existe, no reescribir:** `assertServicioHabilitado` en `services/domain/service-rules.ts`; `assertOdontologoAceptaCitas` y `assertRealizaServicio` en `dentists/domain/dentist-rules.ts`; `HorarioInvalidoError`, `FechaInvalidaError`, `BloqueConCitasError`, `ServicioDeshabilitadoError`, `OdontologoDeshabilitadoError` y `OdontologoNoRealizaServicioError`; las restricciones de la base de datos (`ARQUITECTURA.md` sección 4), que ya no necesitan migración.
- **Errores por crear**, con los nombres de `CONVENCIONES.md` sección 5: `HorarioNoDisponibleError`, `HorarioEnElPasadoError`, `TransicionDeEstadoInvalidaError`, `CitaNoModificableError` y `AccesoDenegadoACitaError`.
- **Cada endpoint** lleva tests de integración sin token (`401`) y con rol incorrecto (`403`).

---

## T1. Horarios de atención y bloques

Rama `feat/horarios-y-bloques`. Ámbito de commits: `availability`. Crea `src/modules/availability/`.

| Método y ruta                          | Roles       | Cuerpo                                                   | Respuesta                           |
| -------------------------------------- | ----------- | -------------------------------------------------------- | ----------------------------------- |
| `GET /dentists/:id/availability`       | autenticado | —                                                        | `200` `{ horarios, bloques }`       |
| `PUT /dentists/:id/availability`       | ADMIN       | `{ horarios: [{ diaSemana, minutoInicio, minutoFin }] }` | `200` `{ horarios, bloques }`       |
| `POST /dentists/:id/blocks`            | ADMIN       | `{ inicio, fin, motivo? }`                               | `201` `{ id, inicio, fin, motivo }` |
| `DELETE /dentists/:id/blocks/:blockId` | ADMIN       | —                                                        | `204`                               |

`horarios` son `{ id, diaSemana, minutoInicio, minutoFin }`, ordenados por día y hora. `bloques` son los que aún no terminan, ordenados por inicio; `motivo` solo se devuelve al ADMIN.

**Reglas**

- `PUT` reemplaza todos los horarios del odontólogo en una sola transacción. Un horario partido son dos filas.
- Validar en el dominio antes de guardar: día de 0 a 6, minutos de 0 a 1440, inicio antes del fin y tramos sin solapar (`HorarioInvalidoError`, `400`).
- Un bloque debe terminar después de empezar y no estar ya terminado (`FechaInvalidaError`, `400`). Si choca con una cita activa, `BloqueConCitasError` (`409`).
- Odontólogo inexistente: `404`. Para quien no es ADMIN, un odontólogo que no acepta citas también da `404`, igual que `GET /dentists/:id`.
- Un `blockId` de otro odontólogo da `404`.

**Tests unitarios (PDF 12):** rechazar horarios inválidos y tramos solapados; aceptar tramos consecutivos; validar el rango de un bloque.

**Tests de integración (PDF 13):** configurar disponibilidad y recuperarla desde la API; `PUT` reemplaza lo anterior; bloque sobre una cita activa da `409`; borrar un bloque.

---

## T2. Horarios disponibles

Rama `feat/horarios-disponibles`. Ámbito: `availability`. Es la tarea con la lógica más delicada del proyecto.

| Método y ruta                               | Roles       | Respuesta                            |
| ------------------------------------------- | ----------- | ------------------------------------ |
| `GET /dentists/:id/slots?serviceId=&fecha=` | autenticado | `200` `[{ inicio, fin }]`, ordenados |

**Dominio, sin Nest ni Prisma ni zona horaria**

- `appointments/domain/end-time.ts`: `calcularHoraFin(inicio, duracionMin)`.
- `appointments/domain/overlap.ts`: `seSolapan(a, b)`.
- `availability/domain/slots.ts`: `calcularSlots({ tramos, bloques, citas, duracionMin, ahora, pasoMin })`, que recibe instantes ya convertidos y devuelve los intervalos libres.

La conversión de `fecha` + minutos a instantes UTC va en una función aparte, con sus propios tests (D7). `T3` y `T4` reutilizan `calcularSlots`: debe haber una sola definición de "horario disponible".

**Reglas**

- Un horario es válido si `[inicio, inicio + duración)` cabe entero en un tramo, no toca un bloque, no se solapa con una cita activa (estado distinto de `CANCELADA`) y `inicio >= ahora`.
- Se generan desde el inicio de cada tramo, cada `PASO_SLOTS_MIN` minutos (D3).
- `fecha` mal formada o inexistente, como `2026-02-30`: `FechaInvalidaError` (`400`). `fecha` pasada: `200` con `[]`.
- Servicio deshabilitado: `409`. Odontólogo que no acepta citas o no realiza el servicio: `409`. Inexistentes: `404`.
- El frontend muestra la lista tal cual y envía el `inicio` recibido al reservar, sin recalcular nada.

**Tests unitarios (PDF 12):** hora de fin; solapamiento (idéntico, parcial, contenido); citas consecutivas; horarios disponibles con duración que no cabe al final del tramo, con bloque, con cita, con cita cancelada y con "ahora" a mitad del día; conversión de zona, incluido un día que cambia al pasar a UTC.

**Tests de integración:** consultar horarios de un odontólogo real; una cita existente quita sus horarios; `fecha` inválida da `400`.

---

## T3. Reservar y consultar citas

Rama `feat/reserva-de-citas`. Ámbito: `appointments`. Crea `src/modules/appointments/`.

| Método y ruta            | Roles                                      | Cuerpo o parámetros                         | Respuesta            |
| ------------------------ | ------------------------------------------ | ------------------------------------------- | -------------------- |
| `POST /appointments`     | PACIENTE                                   | `{ dentistId, serviceId, horaInicio }`      | `201` cita           |
| `GET /appointments/mine` | PACIENTE                                   | `?cuando=proximas\|historial` (opcional)    | `200` lista de citas |
| `GET /appointments/:id`  | paciente dueño, odontólogo asignado, ADMIN | —                                           | `200` cita           |
| `GET /appointments`      | ADMIN                                      | `?fecha=&estado=&dentistId=&limit=&offset=` | `200` lista de citas |

Declarar `mine` antes que `:id` en el controller. `limit` vale 50 por defecto y 100 como máximo.

**Forma de una cita**

```ts
{
  id, horaInicio, horaFin, estado, createdAt,
  servicio: { id, nombre, duracionMin },
  odontologo: { id, nombre, especialidad },
  paciente: { id, nombre, apellido, telefono },
  observacion: { texto, createdAt } | null,
}
```

**Reglas**

- Reservar sigue `ARQUITECTURA.md` sección 5: dentro de una transacción, bloquear al odontólogo con `SELECT ... FOR UPDATE`, volver a validar y recién insertar.
- Validar con `calcularSlots`: `horaInicio` debe estar entre los horarios disponibles de ese día. Si no, `HorarioNoDisponibleError` (`409`); si ya pasó, `HorarioEnElPasadoError` (`409`).
- `horaFin` se calcula con la duración del servicio. La cita nace `PENDIENTE`.
- Si PostgreSQL rechaza por `appointment_no_overlap`, el repository lo traduce a `HorarioNoDisponibleError`.
- Cita ajena: `AccesoDenegadoACitaError` (`403`, no `404`; lo exige el E2E 07). Inexistente: `404`.
- `proximas`: no han empezado y no están `FINALIZADA` ni `CANCELADA`, de la más cercana a la más lejana. `historial`: todas las demás, de la más reciente a la más antigua.

**Tests unitarios (PDF 12):** validar servicio habilitado y odontólogo que realiza el servicio al reservar; clasificar próximas e historial; service con repositories simulados.

**Tests de integración (PDF 13):** crear una cita y verificar su almacenamiento; dos reservas al mismo horario con `Promise.all`: una da `201` y la otra `409`; un paciente solo ve sus citas; cita ajena da `403`.

---

## T4. Reprogramar y cancelar

Rama `feat/reprogramar-y-cancelar`. Ámbito: `appointments`. Agregar a `appointments/` sin crear otro módulo.

| Método y ruta                        | Roles                 | Cuerpo           | Respuesta  |
| ------------------------------------ | --------------------- | ---------------- | ---------- |
| `PATCH /appointments/:id/reschedule` | paciente dueño, ADMIN | `{ horaInicio }` | `200` cita |
| `PATCH /appointments/:id/cancel`     | paciente dueño, ADMIN | —                | `200` cita |

**Reglas**

- Solo desde `PENDIENTE` o `CONFIRMADA` (D1). Si no, `CitaNoModificableError` (`409`).
- Reprogramar usa la misma transacción y las mismas validaciones que reservar, incluidos servicio habilitado y odontólogo que acepta citas.
- **Al calcular los horarios libres se excluye la propia cita**, para poder moverla a un horario que se cruza con el suyo, como de 09:00 a 09:15.
- Se actualiza la misma fila: si el horario nuevo falla, la cita queda intacta (PDF 8). Conserva odontólogo y servicio, y `horaFin` se recalcula (D4).
- Cancelar deja la cita en `CANCELADA` y libera el horario de inmediato.
- Un odontólogo no puede reprogramar ni cancelar: `403`.

**Tests unitarios (PDF 12):** reglas de cancelación y reprogramación para cada estado, positivos y negativos.

**Tests de integración (PDF 13):** cancelar y comprobar que el horario vuelve en `/slots`; reprogramar y verificar el cambio y la liberación del anterior; reprogramar a un horario ocupado da `409` y la cita no cambia; `FINALIZADA` no se cancela.

---

## T5. Estados y observación

Rama `feat/estados-y-observacion`. Ámbitos: `appointments` y `observations`. Crea `src/modules/observations/`.

| Método y ruta                        | Roles               | Cuerpo       | Respuesta                    |
| ------------------------------------ | ------------------- | ------------ | ---------------------------- |
| `PATCH /appointments/:id/status`     | según la transición | `{ estado }` | `200` cita                   |
| `POST /appointments/:id/observation` | odontólogo asignado | `{ texto }`  | `201` `{ texto, createdAt }` |

**Reglas**

- La máquina de estados va en `appointments/domain/appointment-status.ts`, con la tabla de `ARQUITECTURA.md` sección 6 (D2).
- `estado` acepta `CONFIRMADA`, `EN_ATENCION` o `FINALIZADA`. `CANCELADA` da `400`: se cancela con `/cancel`.
- Transición inválida: `TransicionDeEstadoInvalidaError` (`409`). Rol correcto pero no es su cita: `403`.
- Finalizar exige una observación registrada (`409` si no existe).
- La observación solo se registra en `EN_ATENCION` (`409` en otro estado), con `texto` de 1 a 2000 caracteres (D5).

**Tests unitarios (PDF 12):** todas las transiciones permitidas y rechazadas, por estado y por rol.

**Tests de integración:** recorrer `PENDIENTE` → `CONFIRMADA` → `EN_ATENCION` → `FINALIZADA`; finalizar sin observación da `409`; otro odontólogo da `403`; `FINALIZADA` no vuelve a `PENDIENTE`.

---

## T6. Agenda del odontólogo

Rama `feat/agenda-odontologo`. Ámbito: `agenda`. Controller aparte (`agenda.controller.ts`) dentro de `appointments/`.

| Método y ruta                      | Roles      | Parámetros                  | Respuesta            |
| ---------------------------------- | ---------- | --------------------------- | -------------------- |
| `GET /dentists/me/agenda`          | ODONTOLOGO | `?fecha=` (hoy por defecto) | `200` lista de citas |
| `GET /dentists/me/agenda/upcoming` | ODONTOLOGO | `?limit=` (50 por defecto)  | `200` lista de citas |

**Reglas**

- El odontólogo sale del token (`dentistId`); no hay parámetro que permita pedir otra agenda (PDF 9).
- Orden por fecha y hora. Cada cita incluye paciente, servicio, estado y observación (D8).
- "Hoy" se calcula en la zona de la clínica.

**Tests de integración (PDF 13):** un odontólogo consulta únicamente su agenda; orden correcto; un PACIENTE recibe `403`.

---

## T7. Tests pendientes

Rama `test/reglas-existentes`. Sin cambios de comportamiento: si un test descubre un bug, corregirlo aparte con el patrón "pruébalo primero". Es la decisión 18 del README.

**Unitarios**, que faltan en reglas ya escritas:

- `services/domain/service-rules.ts`: validar que un servicio esté habilitado (PDF 12).
- `dentists/domain/dentist-rules.ts`: validar que el odontólogo realice el servicio y acepte citas (PDF 12).
- `users/domain/profile-changes.ts` y `auth/domain/normalize-email.ts`.

**Integración**, hoy solo existen `auth` y `esquema`:

- `dentists`: crear un odontólogo y asociar servicios (PDF 13); vista según el rol; deshabilitado.
- `services`: gestión por ADMIN; un paciente no ve los deshabilitados.
- `users`: gestión por ADMIN; mi cuenta; cambiar contraseña; cuenta deshabilitada pierde el acceso al instante.
- En las tres, cada ruta privada sin token (`401`) y con rol incorrecto (`403`), como pide el PDF 13.

---

## T8. Entorno para los E2E

Rama `test/entorno-e2e`. Ámbito: `e2e`. Construye la infraestructura que define el skill `e2e-playwright` del frontend, que es la referencia; no escribe los escenarios, que van con cada pantalla.

- **Backend en modo test:** script `npm run start:test` contra la BD de test, con `NODE_ENV=test`.
- **Reloj fijo:** `Clock` devuelve una hora fija configurable solo con `NODE_ENV=test`, para que los horarios existan siempre y no caigan en el pasado.
- **Seed de E2E:** script o endpoint disponible solo con `NODE_ENV=test`, con admin, dos pacientes, un odontólogo con dos servicios y horario de lunes a viernes de 09:00 a 12:00, un servicio deshabilitado y sin citas. También debe poder crear las citas que pide cada escenario, incluidas una `CONFIRMADA` de hoy y una `FINALIZADA` con observación.
- **Playwright:** agregar a `playwright.config.ts` el backend como segundo `webServer`, y crear `e2e/fixtures/seed.ts` y `e2e/fixtures/auth.ts`.
- **CI:** el job de frontend hoy no tiene base de datos: agregar PostgreSQL y las migraciones, sin perder los E2E de smoke.
- **Documentación:** en el README, cómo correr toda la suite desde cero, porque el PDF exige que todos los tests puedan ejecutarse de nuevo durante la evaluación.

**Hecho cuando:** un test de prueba inicia sesión por la interfaz contra el backend real, y `npm run test:e2e` da el mismo resultado dos veces seguidas, en local y en el CI. Un test que intente usar el seed sin `NODE_ENV=test` debe fallar.

---

## Cobertura de los tests que pide el PDF

| PDF 12, unitarios              | Tarea  |     | PDF 13, integración                          | Tarea |
| ------------------------------ | ------ | --- | -------------------------------------------- | ----- |
| Hora de finalización           | T2     |     | Registrar paciente y persistencia            | hecho |
| Solapamiento entre dos citas   | T2     |     | Crear odontólogo y asociar servicios         | T7    |
| Citas consecutivas             | T2     |     | Configurar y recuperar disponibilidad        | T1    |
| Fechas u horarios inválidos    | T1, T2 |     | Crear cita y verificar almacenamiento        | T3    |
| Servicio habilitado            | T7, T3 |     | Rechazar doble reserva                       | T3    |
| Odontólogo realiza el servicio | T7, T3 |     | Cancelar y liberar horario                   | T4    |
| Transiciones de estado         | T5     |     | Reprogramar y verificar cambio               | T4    |
| Horarios disponibles           | T2     |     | Solo las citas del paciente autenticado      | T3    |
| Cancelación y reprogramación   | T4     |     | Odontólogo solo consulta su agenda           | T6    |
|                                |        |     | Endpoints sin autenticación o rol incorrecto | todas |

| PDF 14, E2E                 | Tarea |
| --------------------------- | ----- |
| E2E 01 Reservar             | F2    |
| E2E 02 Evitar doble reserva | F2    |
| E2E 03 Reprogramar          | F3    |
| E2E 04 Cancelar             | F3    |
| E2E 05 Atención             | F4    |
| E2E 06 Historial            | F3    |
| E2E 07 Control de acceso    | F3    |

---

## Pantallas del frontend

Se construyen siguiendo `frontend/DISENO.md` y el skill `crear-feature`. Cada escenario E2E se escribe junto con su pantalla, con los pasos y el archivo que define el skill `e2e-playwright`. Las rutas están en `frontend/ARQUITECTURA.md` sección 4.

| Tarea | Rama                        | Carpeta en `src/features/` | Qué incluye                                                                    | E2E            |
| ----- | --------------------------- | -------------------------- | ------------------------------------------------------------------------------ | -------------- |
| F1    | `feat/pantalla-horarios`    | `odontologos/`             | Editar horarios y bloques de un odontólogo (ADMIN)                             | —              |
| F2    | `feat/pantalla-reserva`     | `reserva/`                 | Asistente servicio, odontólogo, fecha y hora, confirmar; `409` con lista nueva | 01, 02         |
| F3    | `feat/pantalla-mis-citas`   | `mis-citas/`               | Próximas, historial, detalle, reprogramar, cancelar; `403` "No tienes acceso"  | 03, 04, 06, 07 |
| F4    | `feat/pantalla-agenda`      | `agenda/`                  | Citas de hoy y próximas, cambio de estado, observación                         | 05             |
| F5    | `feat/pantalla-admin-citas` | `admin-citas/`             | Todas las citas, filtros, confirmar y cancelar                                 | —              |

F2 crea `shared/lib/dates.ts`, `shared/lib/estados-cita.ts` y `EstadoCitaBadge`, que usan F3, F4 y F5.
