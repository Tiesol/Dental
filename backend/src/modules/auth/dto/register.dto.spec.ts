import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

const valido = {
  email: 'ana@mail.com',
  password: 'secreta123',
  nombre: 'Ana',
  apellido: 'Pérez',
};

async function camposConError(body: object) {
  const errors = await validate(plainToInstance(RegisterDto, body));
  return errors.map((e) => e.property).sort();
}

describe('RegisterDto', () => {
  it('rechaza email inválido, password corta, nombre y apellido vacíos', async () => {
    const campos = await camposConError({
      email: 'no-es-email',
      password: '1234567',
      nombre: '',
      apellido: '',
    });

    expect(campos).toEqual(['apellido', 'email', 'nombre', 'password']);
  });

  it('acepta datos válidos sin teléfono', async () => {
    expect(await camposConError(valido)).toEqual([]);
  });

  it('acepta datos válidos con teléfono', async () => {
    expect(await camposConError({ ...valido, telefono: '+591 70000000' })).toEqual([]);
  });
});
