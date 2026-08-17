// src/auth/dto/reset-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { AuthPlatform } from './signIn.dto';

export class ResetPasswordDto {
  @ApiProperty({
    description:
      'Token recebido por e-mail (geralmente 6-10 caracteres ou UUID)',
    example: 'abc123xyz789',
    minLength: 6,
  })
  @IsNotEmpty({ message: 'O token é obrigatório' })
  @IsString({ message: 'O token deve ser uma string' })
  token!: string;

  @ApiProperty({
    description: 'Nova senha do usuário',
    example: 'MinhaSenha@2025',
    minLength: 8,
  })
  @IsNotEmpty({ message: 'A nova senha é obrigatória' })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'A senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número',
  })
  newPassword!: string;
  @ApiProperty({
    example: 'PORTAL',
    description: 'Plataforma de autenticação',
    enum: AuthPlatform,
  })
  @IsNotEmpty()
  @IsEnum(AuthPlatform)
  platform!: AuthPlatform;
}
