---
name: consumo-api
description: Agregar o modificar llamadas a la API REST del backend NestJS desde el frontend (tipos del contrato, funciones de endpoint, manejo del token JWT y de errores 401/403/409). Usar cuando una pantalla necesite un endpoint nuevo o cuando el backend cambie un DTO.
---

# Consumo de la API

Todo acceso a la red vive en `src/api/`. Referencia del contrato: `../backend/ARQUITECTURA.md` sección 8 y los DTOs del backend.

## Estructura

- `http.ts`: instancia base con `baseURL = import.meta.env.VITE_API_URL`. Interceptor de petición adjunta `Authorization: Bearer <token>`. Interceptor de respuesta convierte cualquier fallo en `ApiError` y, ante `401`, limpia la sesión y redirige a `/login`.
- `errors.ts`: `class ApiError extends Error { statusCode: number; message: string; details?: unknown }`.
- `types.ts`: tipos de request y response, espejo de los DTOs. Nombres en inglés iguales a los del backend (`CreateAppointmentRequest`, `AppointmentResponse`).
- `endpoints/<recurso>.ts`: funciones puras `async` que reciben parámetros tipados y devuelven la respuesta tipada. Una función por endpoint.

## Pasos para agregar un endpoint

1. Confirma la ruta, método, roles y cuerpo en `../backend/ARQUITECTURA.md` sección 8 (o en Swagger `/api/docs` si el backend ya corre).
2. Agrega los tipos en `types.ts`. No inventes campos: si el backend aún no los tiene, pregunta al usuario.
3. Agrega la función en `endpoints/<recurso>.ts`:
   ```ts
   export const appointmentsApi = {
     reservar: (body: CreateAppointmentRequest) =>
       http.post<AppointmentResponse>('/appointments', body),
     reprogramar: (id: string, body: RescheduleAppointmentRequest) =>
       http.patch<AppointmentResponse>(`/appointments/${id}/reschedule`, body),
     cancelar: (id: string) => http.patch<AppointmentResponse>(`/appointments/${id}/cancel`),
     mias: () => http.get<AppointmentResponse[]>('/appointments/mine'),
     porId: (id: string) => http.get<AppointmentResponse>(`/appointments/${id}`),
   };
   ```
4. Agrega el handler correspondiente en `src/test/msw/handlers.ts` con una respuesta de ejemplo y las variantes de error que la UI debe manejar (409, 403).
5. Expón el endpoint a la feature a través de un hook (skill `crear-feature`), nunca directamente desde un componente.

## Reglas

- Nunca enviar `horaFin`, `estado` ni `patientId` al crear o reprogramar: el backend los deriva. Solo `serviceId`, `dentistId`, `horaInicio` (ISO UTC tal como lo devolvió el endpoint de slots).
- Fechas: siempre strings ISO 8601 en UTC hacia y desde la API. Conversión a hora de la clínica solo en `shared/lib/dates.ts`.
- `ApiError.message` se muestra al usuario tal cual (viene en español del backend). No traducir ni reescribir códigos de error en el cliente, salvo el mensaje genérico de red "No se pudo conectar con el servidor".
- Los tipos de `types.ts` no se usan directamente como estado de formularios; cada formulario tiene su propio tipo y se mapea al request.
- Sin lógica de reintento automático en mutaciones (una reserva reintentada podría duplicarse si el backend cambia).
