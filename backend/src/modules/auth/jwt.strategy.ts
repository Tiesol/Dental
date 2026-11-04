import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CurrentUserData } from '../../common/types/current-user';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './jwt-payload';

// Estrategia Passport: valida la firma y expiración del Bearer token y construye request.user.
// Además relee el usuario en la BD: si un ADMIN lo deshabilitó (o ya no existe), el token deja de
// servir en ese mismo momento en vez de seguir vigente hasta que expire.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUserData> {
    const user = await this.users.findById(payload.sub);
    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario no disponible');
    }
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      ...(user.patient ? { patientId: user.patient.id } : {}),
      ...(user.dentist ? { dentistId: user.dentist.id } : {}),
    };
  }
}
