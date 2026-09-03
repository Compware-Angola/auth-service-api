// src/auth/dto/check-email.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
} from 'class-validator';
import { OmitType } from '@nestjs/mapped-types';
import { AuthPlatform } from './signIn.dto';

export class CheckEmailExistsDto {
  @ApiProperty({
    description: 'E-mail institucional do estudante ou funcionário',
    example: 'joao.silva@estudante.uma.ao',
    type: String,
  })
  @IsEmail({}, { message: 'Por favor, insira um e-mail válido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  email!: string;

  @ApiProperty({
    description: 'E-mail institucional do estudante ou funcionário',
    example: 'joao.silva@estudante.uma.ao',
    type: String,
  })
  @IsString({ message: 'Por favor, insira um bi válido' })
  @IsOptional()
  bi?: string;

  @ApiProperty({
    example: 'PORTAL',
    description: 'Matrícula do estudante ou funcionário',
    type: String,
  })
  @IsString()
  @IsOptional()
  matricula?: string;

  @ApiProperty({
    example: 'PORTAL',
    description: 'Plataforma de autenticação',
    enum: AuthPlatform,
  })
  @IsNotEmpty()
  @IsEnum(AuthPlatform)
  platform!: AuthPlatform;
}

export class CheckEmailExistsDtoWithOutPlatform extends OmitType(
  CheckEmailExistsDto,
  ['platform'] as const,
) { }
