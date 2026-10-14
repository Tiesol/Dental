import { Injectable } from '@nestjs/common';
import { toPublicUser } from './domain/public-user';
import { NewPatientUser, PublicUser, UserRecord } from './domain/user';
import { UsersRepository } from './users.repository';

// Casos de uso sobre usuarios. Es lo único que otros módulos (auth) pueden importar de este.
@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.users.findByEmail(email);
  }

  findById(id: string): Promise<UserRecord | null> {
    return this.users.findById(id);
  }

  createPatient(data: NewPatientUser): Promise<UserRecord> {
    return this.users.createPatient(data);
  }

  async findAllPublic(): Promise<PublicUser[]> {
    const rows = await this.users.findAll();
    return rows.map(toPublicUser);
  }
}
