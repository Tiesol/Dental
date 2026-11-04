import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'secreta123' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria' })
  @MaxLength(72, { message: 'La contraseña admite hasta 72 caracteres' })
  passwordActual: string;

  @ApiProperty({ example: 'nuevaSecreta456', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña admite hasta 72 caracteres' })
  passwordNueva: string;
}
