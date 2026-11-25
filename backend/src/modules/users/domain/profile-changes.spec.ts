import { FieldNotApplicableToRoleError } from '../../../common/errors/domain-error';
import { buildProfileChanges } from './profile-changes';

describe('buildProfileChanges', () => {
  it('traduce los campos de un PACIENTE a su perfil', () => {
    const changes = buildProfileChanges('PACIENTE', {
      nombre: 'Ana',
      apellido: 'Pérez',
      telefono: ' 70000000 ',
    });

    expect(changes).toEqual({
      patient: { nombre: 'Ana', apellido: 'Pérez', telefono: '70000000' },
    });
  });

  it('un teléfono vacío borra el dato', () => {
    expect(buildProfileChanges('PACIENTE', { telefono: '   ' })).toEqual({
      patient: { telefono: null },
    });
  });

  it('solo incluye los campos enviados', () => {
    expect(buildProfileChanges('PACIENTE', { apellido: 'Pérez' })).toEqual({
      patient: { apellido: 'Pérez' },
    });
  });

  it('traduce los campos de un ODONTOLOGO a su perfil', () => {
    const changes = buildProfileChanges('ODONTOLOGO', {
      nombre: 'Dra. Laura',
      especialidad: 'Ortodoncia',
    });

    expect(changes).toEqual({ dentist: { nombre: 'Dra. Laura', especialidad: 'Ortodoncia' } });
  });

  it('sin campos no produce cambios', () => {
    expect(buildProfileChanges('PACIENTE', {})).toEqual({});
  });

  it('un campo sin valor cuenta como no enviado', () => {
    expect(buildProfileChanges('ADMIN', { nombre: undefined })).toEqual({});
  });

  it('rechaza la especialidad en un PACIENTE, en vez de ignorarla', () => {
    expect(() => buildProfileChanges('PACIENTE', { especialidad: 'General' })).toThrow(
      FieldNotApplicableToRoleError,
    );
  });

  it('rechaza el teléfono en un ODONTOLOGO', () => {
    expect(() => buildProfileChanges('ODONTOLOGO', { telefono: '70000000' })).toThrow(
      FieldNotApplicableToRoleError,
    );
  });

  it('rechaza cualquier campo en un ADMIN, que no tiene perfil', () => {
    expect(() => buildProfileChanges('ADMIN', { nombre: 'Admin' })).toThrow(
      FieldNotApplicableToRoleError,
    );
  });
});
