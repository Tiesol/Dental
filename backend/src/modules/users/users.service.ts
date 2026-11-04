import { Injectable } from '@nestjs/common';
import {
  EmailYaRegistradoError,
  OperacionSobrePropiaCuentaError,
  PasswordActualIncorrectaError,
  RecursoNoEncontradoError,
} from '../../common/errors/domain-error';
import { PasswordHasher } from '../../common/security/password-hasher';
import { normalizeEmail } from '../auth/domain/normalize-email';
import { construirCambiosDePerfil } from './domain/profile-changes';
import { toUserDetail } from './domain/public-user';
import { NewPatientUser, NewStaffUser, UserDetail, UserRecord } from './domain/user';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';

// Casos de uso sobre usuarios. Es lo único que otros módulos (auth) pueden importar de este.
@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  // ---- Usados por auth ----

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.users.findByEmail(email);
  }

  findById(id: string): Promise<UserRecord | null> {
    return this.users.findById(id);
  }

  createPatient(data: NewPatientUser): Promise<UserRecord> {
    return this.users.createPatient(data);
  }

  // ---- Gestión por el ADMIN ----

  async findAll(): Promise<UserDetail[]> {
    const rows = await this.users.findAll();
    return rows.map(toUserDetail);
  }

  async findOne(id: string): Promise<UserDetail> {
    return toUserDetail(await this.getOrThrow(id));
  }

  async createStaff(dto: CreateUserDto): Promise<UserDetail> {
    const email = normalizeEmail(dto.email);
    await this.assertEmailLibre(email);

    const passwordHash = await this.hasher.hash(dto.password);
    const data: NewStaffUser =
      dto.role === 'ODONTOLOGO'
        ? {
            role: 'ODONTOLOGO',
            email,
            passwordHash,
            nombre: dto.nombre!.trim(),
            especialidad: dto.especialidad!.trim(),
          }
        : { role: 'ADMIN', email, passwordHash };
    return toUserDetail(await this.users.createStaff(data));
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDetail> {
    const user = await this.getOrThrow(id);
    const { email, ...perfil } = dto;
    const changes = construirCambiosDePerfil(user.role, perfil);

    if (email !== undefined) {
      const nuevo = normalizeEmail(email);
      if (nuevo !== user.email) {
        await this.assertEmailLibre(nuevo);
        changes.email = nuevo;
      }
    }
    return toUserDetail(await this.users.update(id, changes));
  }

  // Habilitar / deshabilitar una cuenta. Un ADMIN no puede deshabilitarse a sí mismo
  // (así siempre queda al menos un ADMIN activo capaz de revertir el cambio).
  async changeStatus(actorId: string, id: string, activo: boolean): Promise<UserDetail> {
    if (actorId === id) {
      throw new OperacionSobrePropiaCuentaError();
    }
    await this.getOrThrow(id);
    return toUserDetail(await this.users.setActivo(id, activo));
  }

  // ---- Cuenta propia ----

  async updateMyProfile(userId: string, dto: UpdateMyProfileDto): Promise<UserDetail> {
    const user = await this.getOrThrow(userId);
    const changes = construirCambiosDePerfil(user.role, dto);
    return toUserDetail(await this.users.update(userId, changes));
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.getOrThrow(userId);
    if (!(await this.hasher.compare(dto.passwordActual, user.passwordHash))) {
      throw new PasswordActualIncorrectaError();
    }
    await this.users.updatePasswordHash(userId, await this.hasher.hash(dto.passwordNueva));
  }

  private async getOrThrow(id: string): Promise<UserRecord> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new RecursoNoEncontradoError('Usuario');
    }
    return user;
  }

  private async assertEmailLibre(email: string): Promise<void> {
    if (await this.users.findByEmail(email)) {
      throw new EmailYaRegistradoError();
    }
  }
}
