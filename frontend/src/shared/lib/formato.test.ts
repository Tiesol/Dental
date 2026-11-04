import { describe, expect, it } from 'vitest';
import { iniciales } from './formato';

describe('iniciales', () => {
  it('usa la primera letra del primer y del último nombre', () => {
    expect(iniciales('Ana María Pérez Rojas')).toBe('AR');
  });

  it('con un solo nombre devuelve una sola letra', () => {
    expect(iniciales('Administrador')).toBe('A');
  });

  it('ignora los títulos Dr. y Dra.', () => {
    expect(iniciales('Dr. Juan Rojas')).toBe('JR');
    expect(iniciales('Dra. Lucía')).toBe('L');
  });

  it('devuelve las letras en mayúscula aunque el nombre venga en minúscula', () => {
    expect(iniciales('ana pérez')).toBe('AP');
  });

  it('devuelve un signo de interrogación si no hay nombre', () => {
    expect(iniciales('   ')).toBe('?');
  });
});
