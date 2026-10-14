import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';

// Envoltorio de bcrypt inyectable: permite bajar el costo en tests y mockearlo en unitarios.
@Injectable()
export class PasswordHasher {
  constructor(private readonly rounds = 10) {}

  hash(plain: string): Promise<string> {
    return hash(plain, this.rounds);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return compare(plain, hashed);
  }
}
