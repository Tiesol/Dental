import { describe, expect, it } from 'vitest';
import type { Role } from '@/api/types';
import { ROLE_LABEL } from './roles';

describe('ROLE_LABEL', () => {
  it.each<[Role, string]>([
    ['PACIENTE', 'Paciente'],
    ['ODONTOLOGO', 'Odontólogo'],
    ['ADMIN', 'Administrador'],
  ])('traduce el rol %s como "%s" para mostrarlo en la interfaz', (rol, etiqueta) => {
    expect(ROLE_LABEL[rol]).toBe(etiqueta);
  });
});
