import { Prisma, PrismaClient } from '@prisma/client';
import { createDentist, createPatient } from '../helpers/factories';
import { resetDb } from '../helpers/db';

// La base de datos es la última línea de defensa (ARQUITECTURA.md sección 4): estas reglas del PDF
// deben cumplirse aunque la aplicación falle. Por eso se prueban contra PostgreSQL, sin pasar por
// los services.
const prisma = new PrismaClient();

const MONDAY = 1;
const time = (h: number, min = 0) => h * 60 + min;
const instant = (hhmm: string) => new Date(`2030-01-07T${hhmm}:00.000Z`);

const serviceData = (overrides: Partial<Prisma.ServiceCreateInput> = {}) => ({
  nombre: `Servicio ${Math.random()}`,
  descripcion: 'Descripción',
  duracionMin: 30,
  ...overrides,
});

async function findDentistId() {
  const { dentist } = await createDentist(prisma);
  return dentist!.id;
}

// Paciente, odontólogo y servicio listos para crear citas entre ellos.
async function appointmentScenario() {
  const [{ patient }, dentistId, service] = await Promise.all([
    createPatient(prisma),
    findDentistId(),
    prisma.service.create({ data: serviceData() }),
  ]);
  return { patientId: patient!.id, dentistId, serviceId: service.id };
}

beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

describe('esquema de la base de datos', () => {
  describe('Service', () => {
    it.each([0, -30])('rechaza una duración de %i minutos', async (durationMin) => {
      await expect(
        prisma.service.create({ data: serviceData({ duracionMin: durationMin }) }),
      ).rejects.toThrow(/service_duracion_positiva/);
    });

    it('rechaza un precio referencial negativo', async () => {
      await expect(
        prisma.service.create({ data: serviceData({ precioReferencial: -1 }) }),
      ).rejects.toThrow(/service_precio_no_negativo/);
    });

    it('acepta un servicio sin precio referencial', async () => {
      const service = await prisma.service.create({
        data: serviceData({ precioReferencial: null }),
      });

      expect(service.precioReferencial).toBeNull();
    });
  });

  describe('AvailabilityRule', () => {
    const rule = (dentistId: string, overrides = {}) => ({
      dentistId,
      diaSemana: MONDAY,
      minutoInicio: time(8),
      minutoFin: time(12),
      ...overrides,
    });

    it.each([-1, 7])('rechaza el día de la semana %i', async (weekday) => {
      const dentistId = await findDentistId();

      await expect(
        prisma.availabilityRule.create({ data: rule(dentistId, { diaSemana: weekday }) }),
      ).rejects.toThrow(/availability_dia_valido/);
    });

    it.each([
      ['termina antes de empezar', time(12), time(8)],
      ['dura cero minutos', time(8), time(8)],
      ['empieza antes de las 00:00', -1, time(8)],
      ['termina después de las 24:00', time(8), time(24) + 1],
    ])('rechaza un horario que %s', async (_testCase, startMinute, endMinute) => {
      const dentistId = await findDentistId();

      await expect(
        prisma.availabilityRule.create({
          data: rule(dentistId, { minutoInicio: startMinute, minutoFin: endMinute }),
        }),
      ).rejects.toThrow(/availability_minutos_validos/);
    });

    it('rechaza dos horarios solapados del mismo odontólogo el mismo día', async () => {
      const dentistId = await findDentistId();
      await prisma.availabilityRule.create({ data: rule(dentistId) });

      await expect(
        prisma.availabilityRule.create({
          data: rule(dentistId, { minutoInicio: time(11), minutoFin: time(13) }),
        }),
      ).rejects.toThrow(/availability_no_overlap/);
    });

    it('permite un horario partido en dos tramos consecutivos', async () => {
      const dentistId = await findDentistId();
      await prisma.availabilityRule.create({ data: rule(dentistId) });

      await prisma.availabilityRule.create({
        data: rule(dentistId, { minutoInicio: time(12), minutoFin: time(14) }),
      });

      await expect(prisma.availabilityRule.count({ where: { dentistId } })).resolves.toBe(2);
    });

    it('permite el mismo horario otro día o para otro odontólogo', async () => {
      const [dentistA, dentistB] = [await findDentistId(), await findDentistId()];
      await prisma.availabilityRule.create({ data: rule(dentistA) });

      await prisma.availabilityRule.create({ data: rule(dentistA, { diaSemana: 2 }) });
      await prisma.availabilityRule.create({ data: rule(dentistB) });

      await expect(prisma.availabilityRule.count()).resolves.toBe(3);
    });
  });

  describe('UnavailableBlock', () => {
    it('rechaza un bloque que termina antes de empezar o no dura nada', async () => {
      const dentistId = await findDentistId();

      await expect(
        prisma.unavailableBlock.create({
          data: { dentistId, inicio: instant('10:00'), fin: instant('09:00') },
        }),
      ).rejects.toThrow(/unavailable_block_rango_valido/);
      await expect(
        prisma.unavailableBlock.create({
          data: { dentistId, inicio: instant('10:00'), fin: instant('10:00') },
        }),
      ).rejects.toThrow(/unavailable_block_rango_valido/);
    });
  });

  describe('Appointment', () => {
    const appointment = (ids: object, start: string, end: string, overrides = {}) =>
      ({
        ...ids,
        horaInicio: instant(start),
        horaFin: instant(end),
        ...overrides,
      }) as Prisma.AppointmentUncheckedCreateInput;

    it('rechaza una cita cuya hora de fin no es posterior a la de inicio', async () => {
      const ids = await appointmentScenario();

      await expect(
        prisma.appointment.create({ data: appointment(ids, '10:00', '09:00') }),
      ).rejects.toThrow(/appointment_rango_valido/);
      await expect(
        prisma.appointment.create({ data: appointment(ids, '10:00', '10:00') }),
      ).rejects.toThrow(/appointment_rango_valido/);
    });

    it.each([
      ['idéntico', '09:00', '09:30'],
      ['parcial al inicio', '08:45', '09:15'],
      ['parcial al final', '09:15', '09:45'],
      ['contenido', '09:10', '09:20'],
      ['que lo contiene', '08:00', '10:00'],
    ])('rechaza un solapamiento %s con una cita activa', async (_testCase, start, end) => {
      const ids = await appointmentScenario();
      await prisma.appointment.create({ data: appointment(ids, '09:00', '09:30') });

      await expect(
        prisma.appointment.create({ data: appointment(ids, start, end) }),
      ).rejects.toThrow(/appointment_no_overlap/);
    });

    it('permite citas consecutivas', async () => {
      const ids = await appointmentScenario();
      await prisma.appointment.create({ data: appointment(ids, '09:00', '09:30') });

      await prisma.appointment.create({ data: appointment(ids, '09:30', '10:00') });

      await expect(prisma.appointment.count()).resolves.toBe(2);
    });

    it('una cita CANCELADA no bloquea el horario', async () => {
      const ids = await appointmentScenario();
      await prisma.appointment.create({
        data: appointment(ids, '09:00', '09:30', { estado: 'CANCELADA' }),
      });

      await prisma.appointment.create({ data: appointment(ids, '09:00', '09:30') });

      await expect(prisma.appointment.count()).resolves.toBe(2);
    });

    it('al reprogramar sobre un horario ocupado la cita conserva su horario', async () => {
      const ids = await appointmentScenario();
      const original = await prisma.appointment.create({
        data: appointment(ids, '09:00', '09:30'),
      });
      await prisma.appointment.create({ data: appointment(ids, '10:00', '10:30') });

      await expect(
        prisma.appointment.update({
          where: { id: original.id },
          data: { horaInicio: instant('10:00'), horaFin: instant('10:30') },
        }),
      ).rejects.toThrow(/appointment_no_overlap/);

      const reloaded = await prisma.appointment.findUniqueOrThrow({ where: { id: original.id } });
      expect(reloaded.horaInicio).toEqual(instant('09:00'));
    });

    it('dos reservas simultáneas del mismo horario: solo una se guarda', async () => {
      const ids = await appointmentScenario();

      const results = await Promise.allSettled([
        prisma.appointment.create({ data: appointment(ids, '09:00', '09:30') }),
        prisma.appointment.create({ data: appointment(ids, '09:00', '09:30') }),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      await expect(prisma.appointment.count()).resolves.toBe(1);
    });

    it('no se puede borrar un odontólogo con citas: el historial se conserva', async () => {
      const ids = await appointmentScenario();
      await prisma.appointment.create({ data: appointment(ids, '09:00', '09:30') });

      await expect(
        prisma.dentist.delete({ where: { id: (ids as { dentistId: string }).dentistId } }),
      ).rejects.toThrow();

      await expect(prisma.appointment.count()).resolves.toBe(1);
    });
  });

  it('todas las fechas se guardan con zona horaria', async () => {
    const columns = await prisma.$queryRaw<{ tabla: string; columna: string }[]>`
      SELECT table_name AS tabla, column_name AS columna
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name <> '_prisma_migrations'
        AND data_type = 'timestamp without time zone'`;

    expect(columns).toEqual([]);
  });
});
