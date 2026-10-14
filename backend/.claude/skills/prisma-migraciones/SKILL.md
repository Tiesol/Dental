---
name: prisma-migraciones
description: Cambiar el esquema de base de datos con Prisma (editar schema.prisma, generar migración, agregar SQL manual como el constraint de exclusión anti-solapamiento, actualizar seed y tests). Usar ante cualquier cambio de modelo, índice, enum o constraint.
---

# Migraciones con Prisma

## Flujo
1. Edita `prisma/schema.prisma`. Respeta nombres de `CONVENCIONES.md` sección 6.
2. Genera la migración sin aplicarla todavía para poder editarla:
   ```bash
   npx prisma migrate dev --name <descripcion-kebab> --create-only
   ```
3. Si el cambio necesita SQL que Prisma no modela (constraints de exclusión, extensiones, triggers, índices parciales), agrégalo **al final** del `migration.sql` recién creado.
4. Aplica: `npx prisma migrate dev`. Luego `npx prisma generate`.
5. Aplica a la BD de test: `npm run prisma:migrate:test` (equivale a `prisma migrate deploy` con `DATABASE_URL_TEST`).
6. Actualiza `prisma/seed.ts` si el modelo nuevo necesita datos base.
7. Actualiza factories en `test/helpers/factories.ts`.
8. Corre `npm run test && npm run test:int`.

## SQL manual obligatorio en la migración que crea `Appointment`

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_no_overlap
  EXCLUDE USING gist (
    "dentistId" WITH =,
    tstzrange("horaInicio", "horaFin", '[)') WITH &&
  )
  WHERE ("estado" <> 'CANCELADA');

CREATE INDEX appointment_dentist_start_idx ON "Appointment" ("dentistId", "horaInicio");
CREATE INDEX appointment_patient_start_idx ON "Appointment" ("patientId", "horaInicio");
```

El repository debe capturar la violación del constraint `appointment_no_overlap` (error de Prisma con el nombre del constraint en `meta`) y relanzar `HorarioNoDisponibleError`, para que la respuesta sea 409 igual que en el chequeo de aplicación.

## Reglas
- Nunca `prisma db push` fuera de un experimento local; en el repo solo migraciones versionadas.
- Nunca editar una migración ya aplicada en `main`. Crear una nueva.
- Enums de negocio (`AppointmentStatus`, `Role`) como `enum` de Prisma, con los valores en español exactos del PDF.
- Toda migración se prueba corriéndola desde cero en la BD de test (`prisma migrate reset --force` con `DATABASE_URL_TEST`) antes de commitear.
- `.env.example` se actualiza si aparece una variable nueva.
