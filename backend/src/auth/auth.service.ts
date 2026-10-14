import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email.trim().toLowerCase(),
        fullName: dto.fullName,
        passwordHash,
        role: Role.PATIENT,
        patient: { create: {} },
      },
    });
  }
}
