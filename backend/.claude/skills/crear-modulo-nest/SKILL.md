---
name: crear-modulo-nest
description: Crear o extender un módulo de NestJS (controller, service, repository, domain, DTOs) siguiendo la arquitectura por capas del proyecto. Usar al agregar un nuevo recurso de la API o un nuevo caso de uso a un módulo existente.
---

# Crear o extender un módulo NestJS

Sigue `ARQUITECTURA.md` secciones 2, 3 y 8 y `CONVENCIONES.md` sección 4. No improvises otra estructura.

## Pasos

1. **Ubica el agregado.** ¿El recurso es una entidad propia (nuevo módulo en `src/modules/<nombre>/`) o un caso de uso de un módulo existente (nuevo método en su service)? Si dudas, pregunta al usuario; no crees módulos "de utilidad".
2. **Dominio primero.** Escribe en `domain/` las funciones puras que la regla necesita, sin importar nada de Nest ni Prisma. Escribe sus tests unitarios (skill `test-unitario-reglas`) antes que el service.
3. **Repository.** Métodos con nombre de intención (`findActiveByDentistBetween`, `lockDentist`), que reciben y devuelven tipos del dominio. Es el único archivo que importa `PrismaService`. Si la operación forma parte de una transacción, el método acepta el cliente transaccional `tx` como parámetro.
4. **Service (caso de uso).** Un método público por caso de uso. Orquesta: carga, dominio, persiste. Abre `$transaction` si toca más de una fila o depende de un chequeo previo (reservar, reprogramar, cambiar estado). Lanza solo `DomainError`.
5. **DTOs.** `class-validator`. Solo los campos que el cliente puede legítimamente enviar. Documenta con `@ApiProperty`.
6. **Controller.** Rutas según el contrato de `ARQUITECTURA.md` sección 8. Guards y `@Roles()` explícitos. Usa `@CurrentUser()`. Sin lógica.
7. **Module.** Registra providers y exporta solo el service. Impórtalo en `app.module.ts`.
8. **Tests de integración** para cada endpoint nuevo (skill `test-integracion-api`), incluyendo el caso sin token y con rol incorrecto.
9. **Verifica**: `npm run lint && npm run test && npm run test:int`.

## Plantilla mínima de service con transacción

```ts
async reservar(dto: CreateAppointmentDto, user: CurrentUserData): Promise<Appointment> {
  return this.prisma.$transaction(async (tx) => {
    await this.dentists.lockForBooking(tx, dto.dentistId);            // SELECT ... FOR UPDATE
    const service = await this.services.findActiveOrThrow(tx, dto.serviceId);
    const dentist = await this.dentists.findActiveOrThrow(tx, dto.dentistId);
    assertDentistPerformsService(dentist, service);                   // domain
    const end = calcularHoraFin(dto.horaInicio, service.duracionMin); // domain
    assertNotInPast(dto.horaInicio, this.clock.now());                // domain
    const active = await this.appointments.findActiveByDentistBetween(tx, dentist.id, dto.horaInicio, end);
    assertNoOverlap({ inicio: dto.horaInicio, fin: end }, active);     // domain
    await this.availability.assertSlotWithinSchedule(tx, dentist.id, dto.horaInicio, end);
    return this.appointments.create(tx, { ...dto, patientId: user.patientId, horaFin: end, estado: 'PENDIENTE' });
  });
}
```

## Diseño de la API (adaptado de api-and-interface-design)

- **Contrato primero**: antes de codificar, escribe la fila del endpoint en `ARQUITECTURA.md` sección 8 (ruta, método, roles, cuerpo, respuesta) y los tipos de request/response. El DTO es el contrato.
- **Recursos en plural, sin verbos en la URL**: `POST /appointments`, `PATCH /appointments/:id/cancel` (acción como sub-recurso), nunca `/crearCita`. Query params y campos de respuesta en `camelCase`; enums en `UPPER_SNAKE`.
- **Un solo formato de error** (`{ statusCode, error, message, details? }`) y un solo mapeo de códigos: 400 entrada inválida, 401 sin autenticar, 403 sin permiso o no es dueño, 404 no existe, 409 conflicto de negocio.
- **Validar solo en el borde**: DTOs validan la entrada; el dominio y los repositories confían en los tipos. No repetir `if (!dto.x)` dentro de services.
- **Entrada y salida separadas**: el cliente nunca envía campos que el servidor deriva (`horaFin`, `estado`, `patientId`); la respuesta incluye los generados (`id`, `createdAt`).
- **Listados con límite**: `GET /appointments` (ADMIN) y los historiales llevan paginación o filtro por rango de fechas desde el inicio.
- **Cambios aditivos**: agregar campos opcionales; no cambiar tipos ni eliminar campos que el frontend ya consume sin actualizar `frontend/src/api/types.ts` en el mismo cambio.
- **Operaciones de escritura y reintentos**: reservar no es idempotente; el frontend no reintenta automáticamente (ver skill `consumo-api` del frontend). La doble reserva se evita en el servidor con transacción + bloqueo + constraint, no con claves de idempotencia.

## Checklist antes de dar por terminado
- [ ] El dominio no importa `@nestjs/*` ni `@prisma/client`.
- [ ] Ningún `if` de negocio en el controller.
- [ ] Guards y roles declarados; endpoint probado sin token y con rol incorrecto.
- [ ] Verificación de propiedad cuando el recurso pertenece a un paciente u odontólogo.
- [ ] Swagger actualizado.
