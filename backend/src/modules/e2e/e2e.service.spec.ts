import { NotATestDatabaseError } from '../../common/errors/domain-error';
import { PasswordHasher } from '../../common/security/password-hasher';
import { E2eRepository } from './e2e.repository';
import { E2eService } from './e2e.service';

describe('E2eService.seed', () => {
  const repository = {
    databaseName: jest.fn(),
    wipe: jest.fn(),
    createAdmin: jest.fn(),
    createPatient: jest.fn(),
    createService: jest.fn(),
    createDentist: jest.fn(),
  };
  const hasher = { hash: jest.fn().mockResolvedValue('hash') };
  const service = new E2eService(
    repository as unknown as E2eRepository,
    hasher as unknown as PasswordHasher,
  );

  beforeEach(() => jest.clearAllMocks());

  it.each(['dental', 'produccion', 'dental_test_copia'])(
    'no vacía la base "%s", aunque NODE_ENV sea test',
    async (name) => {
      repository.databaseName.mockResolvedValue(name);

      await expect(service.seed()).rejects.toThrow(NotATestDatabaseError);

      expect(repository.wipe).not.toHaveBeenCalled();
    },
  );

  it('vacía y siembra una base cuyo nombre termina en _test', async () => {
    repository.databaseName.mockResolvedValue('dental_test');

    await service.seed();

    expect(repository.wipe).toHaveBeenCalledTimes(1);
    expect(repository.createAdmin).toHaveBeenCalledTimes(1);
  });
});
