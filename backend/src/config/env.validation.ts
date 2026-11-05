import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  validateSync,
} from 'class-validator';

// Acepta solo zonas horarias IANA que el runtime reconoce (p. ej. America/La_Paz).
@ValidatorConstraint({ name: 'zonaHorariaIana' })
class ZonaHorariaIana implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || value === '') return false;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return 'debe ser una zona horaria IANA válida, por ejemplo America/La_Paz';
  }
}

// Variables de entorno obligatorias. La app no arranca si falta alguna (ARQUITECTURA.md sección 10).
export class EnvVars {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN: string = '8h';

  @IsOptional()
  @IsInt()
  @Min(1)
  PORT: number = 3000;

  @IsOptional()
  @IsString()
  FRONTEND_URL: string = 'http://localhost:5173';

  // Intentos permitidos por minuto y por IP en POST /auth/login y /auth/register (anti fuerza bruta).
  @IsOptional()
  @IsInt()
  @Min(1)
  AUTH_THROTTLE_LIMIT: number = 10;

  // Zona horaria de la clínica: los horarios de atención ("09:00") se interpretan en esta zona.
  @IsOptional()
  @Validate(ZonaHorariaIana)
  CLINIC_TIMEZONE: string = 'America/La_Paz';
}

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const validated = plainToInstance(EnvVars, config, { enableImplicitConversion: true });
  const errors = validateSync(validated, { skipMissingProperties: false, whitelist: true });
  if (errors.length > 0) {
    const detalle = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('; ');
    throw new Error(`Configuración inválida. ${detalle}`);
  }
  return validated;
}
