import { CampoNoAplicableAlRolError } from '../../../common/errors/domain-error';
import { construirCambiosDePerfil } from './profile-changes';

describe('construirCambiosDePerfil', () => {
  it('traduce los campos de un PACIENTE a su perfil', () => {
    const cambios = construirCambiosDePerfil('PACIENTE', {
      nombre: 'Ana',
      apellido: 'Pérez',
      telefono: ' 70000000 ',
    });

    expect(cambios).toEqual({
      patient: { nombre: 'Ana', apellido: 'Pérez', telefono: '70000000' },
    });
  });

  it('un teléfono vacío borra el dato', () => {
    expect(construirCambiosDePerfil('PACIENTE', { telefono: '   ' })).toEqual({
      patient: { telefono: null },
    });
  });

  it('solo incluye los campos enviados', () => {
    expect(construirCambiosDePerfil('PACIENTE', { apellido: 'Pérez' })).toEqual({
      patient: { apellido: 'Pérez' },
    });
  });

  it('traduce los campos de un ODONTOLOGO a su perfil', () => {
    const cambios = construirCambiosDePerfil('ODONTOLOGO', {
      nombre: 'Dra. Laura',
      especialidad: 'Ortodoncia',
    });

    expect(cambios).toEqual({ dentist: { nombre: 'Dra. Laura', especialidad: 'Ortodoncia' } });
  });

  it('sin campos no produce cambios', () => {
    expect(construirCambiosDePerfil('PACIENTE', {})).toEqual({});
  });

  it('un campo sin valor cuenta como no enviado', () => {
    expect(construirCambiosDePerfil('ADMIN', { nombre: undefined })).toEqual({});
  });

  it('rechaza la especialidad en un PACIENTE, en vez de ignorarla', () => {
    expect(() => construirCambiosDePerfil('PACIENTE', { especialidad: 'General' })).toThrow(
      CampoNoAplicableAlRolError,
    );
  });

  it('rechaza el teléfono en un ODONTOLOGO', () => {
    expect(() => construirCambiosDePerfil('ODONTOLOGO', { telefono: '70000000' })).toThrow(
      CampoNoAplicableAlRolError,
    );
  });

  it('rechaza cualquier campo en un ADMIN, que no tiene perfil', () => {
    expect(() => construirCambiosDePerfil('ADMIN', { nombre: 'Admin' })).toThrow(
      CampoNoAplicableAlRolError,
    );
  });
});
