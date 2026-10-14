# Arquitectura del frontend — Sistema de Citas para Clínica Dental

Stack decidido: **React + Vite + TypeScript**, tests unitarios/componentes con **Vitest + React Testing Library**, E2E con **Playwright**. Se consume la API REST del backend NestJS con **JWT en el header Authorization**.

Este documento describe cómo se organiza el frontend y por qué. Las reglas de negocio que la interfaz debe reflejar están en el skill `reglas-de-negocio-citas` (versión frontend).

---

## 1. Principios

1. **El frontend refleja reglas, no las decide.** Deshabilita botones y oculta opciones según el estado de la cita y el rol, pero la validación definitiva la hace el backend. Toda acción maneja el caso en que el backend responda 409/403 aunque la UI "creyera" que era válido.
2. **Organización por feature, no por tipo de archivo.** Cada feature (auth, servicios, odontólogos, reserva, mis citas, agenda, admin) contiene sus páginas, componentes, hooks y llamadas a la API.
3. **La UI es testeable desde el primer día.** Cada flujo del PDF (E2E 01 a 07) tiene identificadores estables (`data-testid`) y roles accesibles para que Playwright y RTL no dependan de clases CSS.
4. **Un solo punto de acceso a la red.** Nadie llama `fetch` directo: todo pasa por el cliente de API, que adjunta el token, traduce errores y tipa respuestas.
5. **Estado del servidor separado del estado de la UI.** Lo que viene de la API (citas, slots, servicios) se cachea y se invalida de forma explícita tras reservar, cancelar o reprogramar; el estado local (formularios, modales) vive en los componentes.

---

## 2. Capas

```
Páginas (rutas)              -> componen features, sin lógica de negocio
   │
Features (por dominio)       -> componentes + hooks + api de la feature
   │
Compartido (shared/)         -> componentes UI genéricos, hooks, utilidades de fecha
   │
Cliente de API (api/)        -> http client, tipos del contrato, manejo de auth y errores
```

Dirección de dependencias: de arriba hacia abajo. `shared/` y `api/` nunca importan de `features/`.

---

## 3. Estructura de carpetas

```
frontend/
├── e2e/                               # Playwright: los 7 escenarios del PDF
│   ├── fixtures/                      # login por rol, seed/reset vía backend
│   ├── pages/                         # Page Objects (LoginPage, ReservaPage, MisCitasPage, AgendaPage)
│   └── *.e2e.ts
├── public/
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── App.tsx                    # providers (AuthProvider, Router) + layout        (hecho)
│   │   ├── router.tsx                 # rutas + RequireRole por rol                      (hecho)
│   │   └── layouts/                   # Header (hecho); luego layout por rol
│   ├── api/
│   │   ├── http.ts                    # único acceso a la red: adjunta el JWT, traduce errores (hecho)
│   │   ├── token.ts                   # tokenStore: único acceso a localStorage           (hecho)
│   │   ├── errors.ts                  # ApiError tipado (statusCode, message, details)     (hecho)
│   │   ├── types.ts                   # tipos del contrato REST (espejo de los DTOs del backend)
│   │   └── endpoints/                 # funciones por recurso: auth.ts, users.ts (hechos), services.ts, dentists.ts, availability.ts, appointments.ts
│   ├── features/
│   │   ├── auth/                      # login, registro, AuthProvider, useAuth, RequireRole (hecho)
│   │   ├── cuenta/                    # datos del usuario autenticado                      (hecho)
│   │   ├── admin-usuarios/            # listado de usuarios para ADMIN                     (hecho)
│   │   ├── servicios/                 # catálogo para paciente + CRUD para admin
│   │   ├── odontologos/               # listado para paciente + CRUD, servicios y horarios para admin
│   │   ├── reserva/                   # asistente servicio -> odontólogo -> fecha/hora -> confirmar
│   │   ├── mis-citas/                 # próximas, historial, detalle, reprogramar, cancelar
│   │   ├── agenda/                    # agenda del odontólogo: hoy, próximas, cambio de estado, observación
│   │   └── admin-citas/               # todas las citas, confirmar/cancelar
│   ├── shared/
│   │   ├── components/                # Button, Input, Select, Modal, Table, EstadoCitaBadge, EmptyState, ErrorMessage
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── dates.ts               # formateo y conversión UTC <-> zona de la clínica
│   │   │   └── estados-cita.ts        # etiquetas, colores y acciones permitidas por estado y rol
│   │   └── styles/                    # index.css global (hecho)
│   └── test/                          # pendiente: se crea al instalar Vitest + RTL + MSW
│       ├── setup.ts                   # jest-dom, limpieza, MSW
│       ├── msw/                       # handlers que simulan la API en tests de componentes
│       └── utils.tsx                  # render con providers, factories de datos
├── index.html
├── vite.config.ts
├── vitest.config.ts
└── playwright.config.ts
```

Estructura interna de una feature (ejemplo `reserva/`):

```
reserva/
├── pages/
│   └── ReservaPage.tsx
├── components/
│   ├── PasoServicio.tsx
│   ├── PasoOdontologo.tsx
│   ├── PasoFechaHora.tsx              # calendario + lista de slots disponibles
│   └── ResumenConfirmacion.tsx
├── hooks/
│   ├── useSlotsDisponibles.ts         # consulta GET /dentists/:id/slots
│   └── useReservarCita.ts             # mutación POST /appointments + invalidación de slots y mis citas
├── reserva.types.ts
└── index.ts                           # exporta solo lo público
```

---

## 4. Rutas y control de acceso

| Ruta                                                                                        | Rol                   | Contenido                                                                                                  |
| ------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/login`, `/registro`                                                                       | público               | Autenticación. Registro solo crea PACIENTE.                                                                |
| `/`                                                                                         | autenticado           | Redirige al inicio del rol.                                                                                |
| `/servicios`                                                                                | PACIENTE              | Catálogo de servicios activos.                                                                             |
| `/reservar`                                                                                 | PACIENTE              | Asistente de reserva en pasos.                                                                             |
| `/mis-citas`                                                                                | PACIENTE              | Próximas e historial.                                                                                      |
| `/mis-citas/:id`                                                                            | PACIENTE (dueño)      | Detalle, reprogramar, cancelar. Si la API responde 403 se muestra "No tienes acceso a esta cita" (E2E 07). |
| `/agenda`                                                                                   | ODONTOLOGO            | Citas de hoy y próximas.                                                                                   |
| `/agenda/:id`                                                                               | ODONTOLOGO (asignado) | Detalle, cambiar estado, registrar observación.                                                            |
| `/admin/usuarios` (hecho), `/admin/servicios`, `/admin/odontologos`, `/admin/odontologos/:id/horarios`, `/admin/citas` | ADMIN                 | Gestión.                                                                                                   |

`RequireRole` envuelve cada grupo de rutas: sin sesión redirige a `/login`; con rol incorrecto muestra página 403. Esto es UX; la seguridad real es del backend.

---

## 5. Autenticación en el cliente

- `POST /auth/login` devuelve `{ accessToken, user }`. El token se guarda en `localStorage` a través de `src/api/token.ts` (`tokenStore`), único archivo que toca el almacenamiento. Al arrancar, `AuthProvider` llama `GET /auth/me` para validar el token y cargar el usuario (`{ id, email, role, nombre, patientId?, dentistId? }`).
- `src/api/http.ts` adjunta `Authorization: Bearer <token>` a toda petición. Si `/auth/me` falla, `AuthProvider` limpia la sesión y `RequireRole` redirige a `/login`.
- Nunca se guarda el password ni se decodifica el JWT para decidir permisos: el rol viene de `/auth/me`.

---

## 6. Datos del servidor y sincronización

- Consultas (`GET`) y mutaciones (`POST/PATCH`) se gestionarán con una capa de caché de datos de servidor (propuesta: **TanStack Query**, ver "Decisiones" en el README raíz). Mientras no se confirme, las features usan hooks simples con estado `cargando | ok | error` (ejemplo: `features/admin-usuarios/hooks/useUsuarios.ts`).
- Claves de caché por recurso: `['services']`, `['dentists']`, `['slots', dentistId, serviceId, fecha]`, `['appointments','mine']`, `['appointment', id]`, `['agenda', fecha]`.
- Tras reservar, cancelar o reprogramar se invalidan **siempre**: `slots` del odontólogo afectado, `appointments/mine`, `appointment/:id`. Es la implementación en el cliente de "actualizar disponibilidad después de reservar, cancelar o reprogramar".
- La lista de slots no se filtra en el cliente: se muestra tal cual la devuelve el backend (que ya excluye pasado, bloques y solapamientos).

---

## 7. Estados de la cita en la interfaz

`shared/lib/estados-cita.ts` centraliza, por estado y rol, qué acciones se muestran:

| Estado      | PACIENTE ve                            | ODONTOLOGO ve                    | ADMIN ve            |
| ----------- | -------------------------------------- | -------------------------------- | ------------------- |
| PENDIENTE   | Reprogramar, Cancelar                  | solo lectura                     | Confirmar, Cancelar |
| CONFIRMADA  | Reprogramar, Cancelar                  | Iniciar atención                 | Cancelar            |
| EN_ATENCION | solo lectura                           | Registrar observación, Finalizar | solo lectura        |
| FINALIZADA  | solo lectura (detalle con observación) | solo lectura                     | solo lectura        |
| CANCELADA   | solo lectura                           | solo lectura                     | solo lectura        |

El componente `EstadoCitaBadge` muestra el estado con el texto exacto del PDF (PENDIENTE, CONFIRMADA, EN ATENCIÓN, FINALIZADA, CANCELADA), porque los E2E lo verifican por texto.

---

## 8. Manejo de errores y feedback

- Todo error de la API llega como `ApiError { statusCode, message, details }`. El `message` viene en español desde el backend y se muestra tal cual.
- `409` en reserva o reprogramación: se muestra "El horario ya no está disponible" y se refrescan los slots (E2E 02).
- `403`: página o mensaje de acceso denegado (E2E 07).
- Formularios: validación en cliente con mensajes en español (campos obligatorios, fecha futura), pero sin duplicar reglas de disponibilidad.
- Estados de carga y vacío explícitos en cada lista (`EmptyState`): "No tienes citas próximas", "No hay horarios disponibles para esta fecha".

---

## 9. Estrategia de testing

| Nivel       | Herramienta                                              | Qué cubre                                                                                                                                                                                                           | Dónde                          |
| ----------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Unitario    | Vitest                                                   | `shared/lib/dates.ts`, `estados-cita.ts` (acciones permitidas por estado y rol), validaciones de formularios, hooks puros.                                                                                          | junto al archivo, `*.test.ts`  |
| Componentes | Vitest + RTL + MSW                                       | Páginas y componentes con la API simulada: el asistente de reserva muestra solo odontólogos que realizan el servicio, el detalle oculta "Cancelar" si está FINALIZADA, el mensaje 409 aparece y se refrescan slots. | junto al archivo, `*.test.tsx` |
| E2E         | Playwright contra frontend + backend + PostgreSQL reales | Los 7 escenarios del PDF, interactuando con la interfaz real.                                                                                                                                                       | `e2e/`                         |

Los E2E arrancan backend y frontend (`webServer` en `playwright.config.ts`) y usan un endpoint o script de seed del backend para dejar datos conocidos antes de cada escenario. Ver skill `e2e-playwright`.

---

## 10. Fechas y zona horaria

- La API habla en ISO 8601 UTC. El frontend convierte a la zona de la clínica (`VITE_CLINIC_TIMEZONE`) solo para mostrar, con `date-fns` + `date-fns-tz`.
- Los slots se muestran como "09:00 - 09:30" en hora local de la clínica; el valor que se envía al reservar es el ISO UTC que devolvió el backend para ese slot, sin recalcularlo.

---

## 11. Configuración

```
VITE_API_URL=http://localhost:3000/api/v1
VITE_CLINIC_TIMEZONE=   # por definir con el usuario (misma que el backend)
```
