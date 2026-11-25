import { describe, expect, it } from 'vitest';
import { initials } from './format';

describe('initials', () => {
  it('usa la primera letra del primer y del último nombre', () => {
    expect(initials('Ana María Pérez Rojas')).toBe('AR');
  });

  it('con un solo nombre devuelve una sola letra', () => {
    expect(initials('Administrador')).toBe('A');
  });

  it('ignora los títulos Dr. y Dra.', () => {
    expect(initials('Dr. Juan Rojas')).toBe('JR');
    expect(initials('Dra. Lucía')).toBe('L');
  });

  it('devuelve las letras en mayúscula aunque el nombre venga en minúscula', () => {
    expect(initials('ana pérez')).toBe('AP');
  });

  it('devuelve un signo de interrogación si no hay nombre', () => {
    expect(initials('   ')).toBe('?');
  });
});
