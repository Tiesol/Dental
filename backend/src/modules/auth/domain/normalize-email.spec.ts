import { normalizeEmail } from './normalize-email';

describe('normalizeEmail', () => {
  it('convierte a minúsculas, para que Ana@Mail.com y ana@mail.com sean la misma cuenta', () => {
    expect(normalizeEmail('Ana@Mail.COM')).toBe('ana@mail.com');
  });

  it('quita los espacios de los extremos', () => {
    expect(normalizeEmail('  ana@mail.com ')).toBe('ana@mail.com');
  });
});
