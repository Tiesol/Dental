-- Las fechas existentes se guardaron en UTC: se indica explícitamente para que la conversión no
-- dependa de la zona horaria de la sesión.
-- AlterTable
ALTER TABLE "Appointment"
  ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "Observation"
  ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "User"
  ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- CreateIndex
CREATE INDEX "DentistService_serviceId_idx" ON "DentistService"("serviceId");


-- ---------------------------------------------------------------------------
-- SQL manual (no modelable en schema.prisma). Ver ARQUITECTURA.md sección 4 y el
-- skill prisma-migraciones. La aplicación valida lo mismo con mensajes en español;
-- esto es la última línea de defensa si la aplicación falla.
-- ---------------------------------------------------------------------------

-- PDF sección 11: "duración positiva". El precio referencial es opcional, pero no negativo.
ALTER TABLE "Service"
  ADD CONSTRAINT "service_duracion_positiva" CHECK ("duracionMin" > 0),
  ADD CONSTRAINT "service_precio_no_negativo" CHECK ("precioReferencial" >= 0);

-- PDF sección 11: "fechas y horas válidas". 0 = domingo ... 6 = sábado; minutos desde las 00:00.
ALTER TABLE "AvailabilityRule"
  ADD CONSTRAINT "availability_dia_valido" CHECK ("diaSemana" BETWEEN 0 AND 6),
  ADD CONSTRAINT "availability_minutos_validos"
    CHECK ("minutoInicio" >= 0 AND "minutoFin" <= 1440 AND "minutoInicio" < "minutoFin");

-- Dos tramos del mismo odontólogo y día no pueden solaparse: duplicarían horarios al calcular la
-- disponibilidad. Intervalo semiabierto: 08:00-12:00 y 12:00-14:00 sí se permiten.
ALTER TABLE "AvailabilityRule"
  ADD CONSTRAINT "availability_no_overlap"
  EXCLUDE USING gist (
    "dentistId" WITH =,
    "diaSemana" WITH =,
    int4range("minutoInicio", "minutoFin", '[)') WITH &&
  );

ALTER TABLE "UnavailableBlock"
  ADD CONSTRAINT "unavailable_block_rango_valido" CHECK ("inicio" < "fin");

-- Sin esto, un rango invertido fallaría con un error confuso dentro de appointment_no_overlap, y
-- uno vacío (inicio = fin) nunca se solaparía con nada.
ALTER TABLE "Appointment"
  ADD CONSTRAINT "appointment_rango_valido" CHECK ("horaInicio" < "horaFin");
