import {
  AccesoDenegadoACitaError,
  HorarioEnElPasadoError,
  HorarioNoDisponibleError,
} from '../../../common/errors/domain-error';
import { AppointmentStatus } from './appointment';
import { assertHorarioReservable, assertPuedeVerCita, filtrarPorCuando } from './appointment-rules';

const instante = (hora: string) => new Date(`2026-11-10T${hora}:00.000Z`);

describe('assertHorarioReservable', () => {
  const ahora = instante('12:00');
  const slots = [
    { inicio: instante('13:00'), fin: instante('13:30') },
    { inicio: instante('13:15'), fin: instante('13:45') },
  ];

  it('acepta un horario que está entre los disponibles', () => {
    expect(() => assertHorarioReservable(instante('13:15'), slots, ahora)).not.toThrow();
  });

  it('rechaza un horario que no está entre los disponibles', () => {
    expect(() => assertHorarioReservable(instante('14:00'), slots, ahora)).toThrow(
      HorarioNoDisponibleError,
    );
  });

  it('rechaza un horario que cae dentro de un disponible pero no empieza con él', () => {
    expect(() => assertHorarioReservable(instante('13:05'), slots, ahora)).toThrow(
      HorarioNoDisponibleError,
    );
  });

  it('rechaza un horario que ya pasó, indicándolo con su propio error', () => {
    expect(() => assertHorarioReservable(instante('11:00'), slots, ahora)).toThrow(
      HorarioEnElPasadoError,
    );
  });

  it('acepta un horario disponible que empieza exactamente ahora', () => {
    const delMomento = [{ inicio: ahora, fin: instante('12:30') }];

    expect(() => assertHorarioReservable(instante('12:00'), delMomento, ahora)).not.toThrow();
  });
});

describe('assertPuedeVerCita', () => {
  const cita = {
    paciente: { id: 'p1', nombre: 'Ana', apellido: 'Pérez', telefono: null },
    odontologo: { id: 'd1', nombre: 'Dra. Gómez', especialidad: 'General' },
  };

  it('permite verla al paciente dueño', () => {
    const user = { role: 'PACIENTE' as const, patientId: 'p1' };

    expect(() => assertPuedeVerCita(cita, user)).not.toThrow();
  });

  it('permite verla al odontólogo asignado', () => {
    const user = { role: 'ODONTOLOGO' as const, dentistId: 'd1' };

    expect(() => assertPuedeVerCita(cita, user)).not.toThrow();
  });

  it('permite verla al ADMIN', () => {
    expect(() => assertPuedeVerCita(cita, { role: 'ADMIN' })).not.toThrow();
  });

  it('rechaza a otro paciente', () => {
    const user = { role: 'PACIENTE' as const, patientId: 'p2' };

    expect(() => assertPuedeVerCita(cita, user)).toThrow(AccesoDenegadoACitaError);
  });

  it('rechaza a otro odontólogo', () => {
    const user = { role: 'ODONTOLOGO' as const, dentistId: 'd2' };

    expect(() => assertPuedeVerCita(cita, user)).toThrow(AccesoDenegadoACitaError);
  });
});

describe('filtrarPorCuando', () => {
  const ahora = instante('12:00');
  const cita = (id: string, hora: string, estado: AppointmentStatus) => ({
    id,
    horaInicio: instante(hora),
    estado,
  });
  const ids = (citas: { id: string }[]) => citas.map((c) => c.id);

  const futuraLejana = cita('futura-lejana', '18:00', 'CONFIRMADA');
  const futuraCercana = cita('futura-cercana', '13:00', 'PENDIENTE');
  const pasada = cita('pasada', '09:00', 'FINALIZADA');
  const masAntigua = cita('mas-antigua', '08:00', 'PENDIENTE');
  const canceladaFutura = cita('cancelada-futura', '15:00', 'CANCELADA');
  const finalizadaFutura = cita('finalizada-futura', '16:00', 'FINALIZADA');
  const todas = [
    masAntigua,
    futuraLejana,
    canceladaFutura,
    pasada,
    finalizadaFutura,
    futuraCercana,
  ];

  it('próximas: no han empezado ni terminaron, de la más cercana a la más lejana', () => {
    expect(ids(filtrarPorCuando(todas, 'proximas', ahora))).toEqual([
      'futura-cercana',
      'futura-lejana',
    ]);
  });

  it('historial: todas las demás, de la más reciente a la más antigua', () => {
    expect(ids(filtrarPorCuando(todas, 'historial', ahora))).toEqual([
      'finalizada-futura',
      'cancelada-futura',
      'pasada',
      'mas-antigua',
    ]);
  });

  it('una cita que empieza exactamente ahora ya no es próxima', () => {
    const delMomento = cita('del-momento', '12:00', 'CONFIRMADA');

    expect(filtrarPorCuando([delMomento], 'proximas', ahora)).toEqual([]);
    expect(ids(filtrarPorCuando([delMomento], 'historial', ahora))).toEqual(['del-momento']);
  });

  it('sin filtro devuelve todas, de la más reciente a la más antigua', () => {
    expect(ids(filtrarPorCuando(todas, undefined, ahora))).toEqual([
      'futura-lejana',
      'finalizada-futura',
      'cancelada-futura',
      'futura-cercana',
      'pasada',
      'mas-antigua',
    ]);
  });
});
