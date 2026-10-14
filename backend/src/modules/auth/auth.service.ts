import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  CredencialesInvalidasError,
  EmailYaRegistradoError,
  UsuarioNoDisponibleError,
} from '../../common/errors/domain-error';
import { toPublicUser } from '../users/domain/public-user';
import { PublicUser, UserRecord } from '../users/domain/user';
import { UsersService } from '../users/users.service';
import { normalizeEmail } from './domain/normalize-email';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt-payload';
import { PasswordHasher } from './password-hasher';

export type LoginResult = { accessToken: string; user: PublicUser };

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly hasher: PasswordHasher,
  ) {}

  // Registro público: siempre PACIENTE (el rol jamás se toma del cliente).
  async register(dto: RegisterDto): Promise<PublicUser> {
    const email = normalizeEmail(dto.email);
    if (await this.users.findByEmail(email)) {
      throw new EmailYaRegistradoError();
    }

    const passwordHash = await this.hasher.hash(dto.password);
    const user = await this.users.createPatient({
      email,
      passwordHash,
      nombre: dto.nombre,
      apellido: dto.apellido,
      telefono: dto.telefono,
    });
    return toPublicUser(user);
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.users.findByEmail(normalizeEmail(dto.email));
    const valido =
      user !== null && user.activo && (await this.hasher.compare(dto.password, user.passwordHash));
    if (!user || !valido) {
      throw new CredencialesInvalidasError();
    }

    const accessToken = await this.jwt.signAsync(buildPayload(user));
    return { accessToken, user: toPublicUser(user) };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user || !user.activo) {
      throw new UsuarioNoDisponibleError();
    }
    return toPublicUser(user);
  }
}

function buildPayload(user: UserRecord): JwtPayload {
  return {
    sub: user.id,
    email: user.email,
    role: user.role,
    ...(user.patient ? { patientId: user.patient.id } : {}),
    ...(user.dentist ? { dentistId: user.dentist.id } : {}),
  };
}
