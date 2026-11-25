import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

const valid = {
  email: 'ana@mail.com',
  password: 'secreta123',
  nombre: 'Ana',
  apellido: 'Pérez',
};

async function fieldsWithErrors(body: object) {
  const errors = await validate(plainToInstance(RegisterDto, body));
  return errors.map((e) => e.property).sort();
}

describe('RegisterDto', () => {
  it('rechaza email inválido, password corta, nombre y apellido vacíos', async () => {
    const fields = await fieldsWithErrors({
      email: 'no-es-email',
      password: '1234567',
      nombre: '',
      apellido: '',
    });

    expect(fields).toEqual(['apellido', 'email', 'nombre', 'password']);
  });

  it('acepta datos válidos sin teléfono', async () => {
    expect(await fieldsWithErrors(valid)).toEqual([]);
  });

  it('acepta datos válidos con teléfono', async () => {
    expect(await fieldsWithErrors({ ...valid, telefono: '+591 70000000' })).toEqual([]);
  });
});
