import { Clock } from './clock';

describe('Clock', () => {
  const entorno = process.env;

  beforeEach(() => {
    process.env = { ...entorno };
  });

  afterAll(() => {
    process.env = entorno;
  });

  it('con NODE_ENV=test y CLOCK_NOW devuelve esa hora fija', () => {
    process.env.NODE_ENV = 'test';
    process.env.CLOCK_NOW = '2026-11-09T12:00:00.000Z';

    expect(new Clock().now()).toEqual(new Date('2026-11-09T12:00:00.000Z'));
  });

  it('con NODE_ENV=test y sin CLOCK_NOW devuelve la hora real', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.CLOCK_NOW;
    const antes = Date.now();

    const ahora = new Clock().now().getTime();

    expect(ahora).toBeGreaterThanOrEqual(antes);
    expect(ahora).toBeLessThanOrEqual(Date.now());
  });

  it.each(['production', 'development'])('con NODE_ENV=%s ignora CLOCK_NOW', (entornoNode) => {
    process.env.NODE_ENV = entornoNode;
    process.env.CLOCK_NOW = '2001-01-01T00:00:00.000Z';

    expect(new Clock().now().getFullYear()).not.toBe(2001);
  });
});
