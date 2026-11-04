import { Injectable, Optional } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';

// Envoltorio de bcrypt inyectable: permite bajar el costo en tests y mockearlo en unitarios.
@Injectable()
export class PasswordHasher {
  // @Optional(): Nest no tiene un provider para el número de rondas; sin el decorador intenta
  // inyectarlo y la app no arranca. Así Nest pasa undefined y se usa el valor por defecto.
  constructor(@Optional() private readonly rounds: number = 10) {}

  hash(plain: string): Promise<string> {
    return hash(plain, this.rounds);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return compare(plain, hashed);
  }
}
