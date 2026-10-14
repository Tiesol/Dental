---
name: test-integracion-api
description: Escribir tests de integración con Jest + Supertest contra la aplicación NestJS real y una base PostgreSQL de test. Usar al agregar o cambiar endpoints, guards, o reglas que dependen de la base de datos (doble reserva concurrente, liberación de horario, control de acceso por rol).
---

# Tests de integración de la API

Cubren la sección 13 del PDF y los ítems "Se prueban endpoints/API", "Integración con base de datos", "Test de doble reserva", "Se prueba autenticación/autorización".

## Infraestructura
- Base PostgreSQL de test en `DATABASE_URL_TEST` (misma instancia de `docker-compose`, base distinta).
- `test/helpers/app.ts`: levanta la app Nest con la misma configuración que producción (`ValidationPipe`, filtros, guards globales). Se crea una vez por archivo (`beforeAll`), se cierra en `afterAll`.
- `test/helpers/db.ts`: `resetDb()` ejecuta `TRUNCATE` de todas las tablas con `CASCADE` en `beforeEach`. Nunca se mockea Prisma.
- `test/helpers/factories.ts`: `crearPaciente(prisma)`, `crearOdontologo(prisma)`, `crearAdmin(prisma)` (hechas); `crearServicio()`, `crearDisponibilidad()`, `crearCita()` (por agregar). Devuelven la entidad persistida más la contraseña en claro para poder loguearse.
- `test/helpers/auth.ts`: `ruta(path)` antepone el prefijo `/api/v1`; `loginComo(app, { email, password })` devuelve el token real; `conToken(req, token)` agrega el header.
- Reloj: la app recibe un `Clock` inyectable; en integración se fija a una fecha conocida para que "no en el pasado" sea determinista.

## Lista obligatoria (sección 13) y archivo
| Caso | Archivo |
|---|---|
| Registrar paciente y verificar persistencia | `test/integration/auth.int-spec.ts` |
| Crear odontólogo y asociar servicios | `test/integration/dentists.int-spec.ts` |
| Configurar disponibilidad y recuperarla | `test/integration/availability.int-spec.ts` |
| Crear cita y verificar almacenamiento (incl. `horaFin` calculada) | `test/integration/appointments.create.int-spec.ts` |
| Dos citas mismo odontólogo y horario, rechazo | mismo archivo; secuencial **y** concurrente |
| Cancelar y comprobar que el slot vuelve a aparecer | `test/integration/appointments.cancel.int-spec.ts` |
| Reprogramar y verificar cambio de horario (y liberación del anterior) | `test/integration/appointments.reschedule.int-spec.ts` |
| Paciente solo ve sus citas | `test/integration/access-control.int-spec.ts` |
| Odontólogo solo ve su agenda | mismo archivo |
| Endpoints protegidos sin token / rol incorrecto | mismo archivo, `it.each` sobre la tabla de rutas |

## Patrón

```ts
it('rechaza la segunda reserva cuando dos peticiones toman el mismo horario casi simultáneamente', async () => {
  // Arrange
  const servicio = await crearServicio({ duracionMin: 30 });
  const odontologo = await crearOdontologo({ servicios: [servicio] });
  await crearDisponibilidad(odontologo, { dia: 'LUNES', de: '09:00', a: '12:00' });
  const [p1, p2] = await Promise.all([crearPaciente(), crearPaciente()]);
  const body = { serviceId: servicio.id, dentistId: odontologo.id, horaInicio: '2026-11-09T09:00:00Z' };

  // Act
  const [r1, r2] = await Promise.all([
    authed(request(app), p1.token).post('/api/v1/appointments').send(body),
    authed(request(app), p2.token).post('/api/v1/appointments').send(body),
  ]);

  // Assert
  const codigos = [r1.status, r2.status].sort();
  expect(codigos).toEqual([201, 409]);
  expect(await contarCitasActivas(odontologo.id)).toBe(1);
});
```

## Reglas del skill
1. Siempre verificar **en la base de datos** además de la respuesta HTTP (`prisma.appointment.findUnique(...)`), porque el ítem evaluado es "verificar persistencia".
2. Para cada endpoint protegido: un caso `401` sin token y un caso `403` con rol incorrecto. Centralizar en `it.each`.
3. Control de acceso por propiedad: crear dos pacientes, cita del primero, `GET` con token del segundo da `403`, y el cuerpo no filtra datos de la cita.
4. Liberación de horario: consultar `GET /dentists/:id/slots` antes y después de cancelar y afirmar que el slot reaparece.
5. Reprogramación fallida: intentar reprogramar a un horario ocupado y afirmar que la cita original **no cambió** (`horaInicio` igual al previo).
6. Tests independientes: ningún test depende del orden ni de datos de otro. Si `resetDb()` falta en `beforeEach`, el test está mal.
7. Comando: `npm run test:int`. Debe correr en limpio tras `npm run prisma:migrate:test`.
