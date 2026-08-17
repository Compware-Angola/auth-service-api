// src/users/dto/update-password.dto.ts
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Nova senha do usuário',
    minLength: 4,
    example: 'Senha1234',
  })
  @IsString()
  @MinLength(4, { message: 'A nova senha deve ter pelo menos 4 caracteres' })
  newPassword: string;

  @ApiProperty({
    description: 'Confirmação da nova senha',
    minLength: 4,
    example: 'Senha1234',
  })
  @IsString()
  @MinLength(4)
  confirmPassword: string;
}
