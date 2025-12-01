// src/auth/dto/send-renew-data.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { AuthPlatform } from './signIn.dto';



export class SendRenewDataDto {
  @ApiProperty({
    description: 'E-mail institucional atual ou o que o usuário utiliza',
    example: 'joao.novo@gmail.com',
  })
  @IsEmail({}, { message: 'Insira um e-mail válido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  email: string;

  @ApiProperty({
    description: 'Número de matrícula do estudante',
    example: '202300145',
  })
  @IsString()

  @IsOptional()
  enrrolment?: string;

  @ApiProperty({
    description: 'Telefone com código de Angola',
    example: '+244 923 456 789',
  })
  @IsString()
  @IsNotEmpty()
 
  phone: string;

  @ApiProperty({
    description: 'Motivo detalhado da solicitação',
    example: 'Mudei de e-mail em 2025 e não recebo notificações do portal.',
    minLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @Length(20, 500)
  details: string;

  @ApiProperty({
    example: 'PORTAL',
    description: 'Plataforma de autenticação',
    enum: AuthPlatform,
  })
  @IsNotEmpty()
  @IsEnum(AuthPlatform)
  platform: AuthPlatform;
}