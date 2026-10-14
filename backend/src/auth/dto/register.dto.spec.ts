import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

const valido = {
  email: 'ana@mail.com',
  password: 'secreta123',
  fullName: 'Ana Pérez',
};

async function camposConError(body: object) {
  const errors = await validate(plainToInstance(RegisterDto, body));
  return errors.map((e) => e.property);
}

describe('RegisterDto', () => {
  it('rechaza email inválido, password corta y fullName vacío', async () => {
    const campos = await camposConError({
      email: 'no-es-email',
      password: '1234567',
      fullName: '',
    });

    expect(campos.sort()).toEqual(['email', 'fullName', 'password']);
  });

  it('acepta datos válidos', async () => {
    expect(await camposConError(valido)).toEqual([]);
  });
});
