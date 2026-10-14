import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CurrentUserData } from '../../common/types/current-user';
import { JwtPayload } from './jwt-payload';

// Estrategia Passport: valida la firma y expiración del Bearer token y construye request.user.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): CurrentUserData {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      ...(payload.patientId ? { patientId: payload.patientId } : {}),
      ...(payload.dentistId ? { dentistId: payload.dentistId } : {}),
    };
  }
}
