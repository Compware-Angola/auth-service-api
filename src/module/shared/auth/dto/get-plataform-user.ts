// src/auth/dto/check-email.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { AuthPlatform } from './signIn.dto';

export class GetCurrentPlataformDto {

  @ApiProperty({
    example: 'GA',
    description: 'Plataforma de autenticação',
    enum: AuthPlatform,
  })
  @IsNotEmpty()
  @IsEnum(AuthPlatform)
  platform: AuthPlatform;
}