import {
  AppointmentAccessDeniedError,
  AppointmentNotModifiableError,
  SlotInThePastError,
  SlotUnavailableError,
} from '../../../common/errors/domain-error';
import { AppointmentStatus } from './appointment';
import {
  assertAppointmentModifiable,
  assertSlotBookable,
  assertCanViewAppointment,
  filterByWhen,
} from './appointment-rules';

const instant = (time: string) => new Date(`2026-11-10T${time}:00.000Z`);

describe('assertSlotBookable', () => {
  const now = instant('12:00');
  const slots = [
    { inicio: instant('13:00'), fin: instant('13:30') },
    { inicio: instant('13:15'), fin: instant('13:45') },
  ];

  it('acepta un horario que está entre los disponibles', () => {
    expect(() => assertSlotBookable(instant('13:15'), slots, now)).not.toThrow();
  });

  it('rechaza un horario que no está entre los disponibles', () => {
    expect(() => assertSlotBookable(instant('14:00'), slots, now)).toThrow(SlotUnavailableError);
  });

  it('rechaza un horario que cae dentro de un disponible pero no empieza con él', () => {
    expect(() => assertSlotBookable(instant('13:05'), slots, now)).toThrow(SlotUnavailableError);
  });

  it('rechaza un horario que ya pasó, indicándolo con su propio error', () => {
    expect(() => assertSlotBookable(instant('11:00'), slots, now)).toThrow(SlotInThePastError);
  });

  it('acepta un horario disponible que empieza exactamente ahora', () => {
    const ongoing = [{ inicio: now, fin: instant('12:30') }];

    expect(() => assertSlotBookable(instant('12:00'), ongoing, now)).not.toThrow();
  });
});

describe('assertCanViewAppointment', () => {
  const appointment = {
    paciente: { id: 'p1', nombre: 'Ana', apellido: 'Pérez', telefono: null },
    odontologo: { id: 'd1', nombre: 'Dra. Gómez', especialidad: 'General' },
  };

  it('permite verla al paciente dueño', () => {
    const user = { role: 'PACIENTE' as const, patientId: 'p1' };

    expect(() => assertCanViewAppointment(appointment, user)).not.toThrow();
  });

  it('permite verla al odontólogo asignado', () => {
    const user = { role: 'ODONTOLOGO' as const, dentistId: 'd1' };

    expect(() => assertCanViewAppointment(appointment, user)).not.toThrow();
  });

  it('permite verla al ADMIN', () => {
    expect(() => assertCanViewAppointment(appointment, { role: 'ADMIN' })).not.toThrow();
  });

  it('rechaza a otro paciente', () => {
    const user = { role: 'PACIENTE' as const, patientId: 'p2' };

    expect(() => assertCanViewAppointment(appointment, user)).toThrow(AppointmentAccessDeniedError);
  });

  it('rechaza a otro odontólogo', () => {
    const user = { role: 'ODONTOLOGO' as const, dentistId: 'd2' };

    expect(() => assertCanViewAppointment(appointment, user)).toThrow(AppointmentAccessDeniedError);
  });
});

describe('assertAppointmentModifiable', () => {
  it.each(['PENDIENTE', 'CONFIRMADA'] as const)(
    'permite cancelar o reprogramar una cita %s',
    (status) => {
      expect(() => assertAppointmentModifiable(status)).not.toThrow();
    },
  );

  it.each(['EN_ATENCION', 'FINALIZADA', 'CANCELADA'] as const)(
    'rechaza cancelar o reprogramar una cita %s',
    (status) => {
      expect(() => assertAppointmentModifiable(status)).toThrow(AppointmentNotModifiableError);
    },
  );
});

describe('filterByWhen', () => {
  const now = instant('12:00');
  const appointment = (id: string, time: string, status: AppointmentStatus) => ({
    id,
    horaInicio: instant(time),
    estado: status,
  });
  const ids = (appointments: { id: string }[]) => appointments.map((c) => c.id);

  const farFuture = appointment('futura-lejana', '18:00', 'CONFIRMADA');
  const nearFuture = appointment('futura-cercana', '13:00', 'PENDIENTE');
  const past = appointment('pasada', '09:00', 'FINALIZADA');
  const oldest = appointment('mas-antigua', '08:00', 'PENDIENTE');
  const futureCancelled = appointment('cancelada-futura', '15:00', 'CANCELADA');
  const futureFinished = appointment('finalizada-futura', '16:00', 'FINALIZADA');
  const all = [oldest, farFuture, futureCancelled, past, futureFinished, nearFuture];

  it('próximas: no han empezado ni terminaron, de la más cercana a la más lejana', () => {
    expect(ids(filterByWhen(all, 'proximas', now))).toEqual(['futura-cercana', 'futura-lejana']);
  });

  it('historial: todas las demás, de la más reciente a la más antigua', () => {
    expect(ids(filterByWhen(all, 'historial', now))).toEqual([
      'finalizada-futura',
      'cancelada-futura',
      'pasada',
      'mas-antigua',
    ]);
  });

  it('una cita que empieza exactamente ahora ya no es próxima', () => {
    const ongoing = appointment('del-momento', '12:00', 'CONFIRMADA');

    expect(filterByWhen([ongoing], 'proximas', now)).toEqual([]);
    expect(ids(filterByWhen([ongoing], 'historial', now))).toEqual(['del-momento']);
  });

  it('sin filtro devuelve todas, de la más reciente a la más antigua', () => {
    expect(ids(filterByWhen(all, undefined, now))).toEqual([
      'futura-lejana',
      'finalizada-futura',
      'cancelada-futura',
      'futura-cercana',
      'pasada',
      'mas-antigua',
    ]);
  });
});
