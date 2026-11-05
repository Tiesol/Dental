import { BaseNoEsDeTestError } from '../../common/errors/domain-error';
import { PasswordHasher } from '../../common/security/password-hasher';
import { E2eRepository } from './e2e.repository';
import { E2eService } from './e2e.service';

describe('E2eService.sembrar', () => {
  const repository = {
    nombreDeLaBase: jest.fn(),
    vaciar: jest.fn(),
    crearAdmin: jest.fn(),
    crearPaciente: jest.fn(),
    crearServicio: jest.fn(),
    crearOdontologo: jest.fn(),
  };
  const hasher = { hash: jest.fn().mockResolvedValue('hash') };
  const service = new E2eService(
    repository as unknown as E2eRepository,
    hasher as unknown as PasswordHasher,
  );

  beforeEach(() => jest.clearAllMocks());

  it.each(['dental', 'produccion', 'dental_test_copia'])(
    'no vacía la base "%s", aunque NODE_ENV sea test',
    async (nombre) => {
      repository.nombreDeLaBase.mockResolvedValue(nombre);

      await expect(service.sembrar()).rejects.toThrow(BaseNoEsDeTestError);

      expect(repository.vaciar).not.toHaveBeenCalled();
    },
  );

  it('vacía y siembra una base cuyo nombre termina en _test', async () => {
    repository.nombreDeLaBase.mockResolvedValue('dental_test');

    await service.sembrar();

    expect(repository.vaciar).toHaveBeenCalledTimes(1);
    expect(repository.crearAdmin).toHaveBeenCalledTimes(1);
  });
});
