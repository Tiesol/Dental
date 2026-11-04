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
import { PasswordHasher } from '../../common/security/password-hasher';

export type LoginResult = { accessToken: string; user: PublicUser };

// Hash bcrypt (costo 10, igual al real) de un texto aleatorio que nadie conoce. Solo sirve para
// gastar el mismo tiempo de bcrypt cuando el email no existe.
const HASH_DE_RELLENO = '$2b$10$FphyStJOYScq5b7s3TgjdewYAgw91JkjyxIC1.hB/BQ3NMfdr69uO';

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
    // Se compara SIEMPRE contra un hash (el real o uno de relleno) para que la respuesta tarde
    // lo mismo exista o no el email, y no se pueda averiguar qué cuentas existen midiendo tiempos.
    const passwordOk = await this.hasher.compare(
      dto.password,
      user?.passwordHash ?? HASH_DE_RELLENO,
    );
    if (!user || !user.activo || !passwordOk) {
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
