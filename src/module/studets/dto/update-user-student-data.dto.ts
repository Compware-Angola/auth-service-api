import { ApiProperty, PartialType } from '@nestjs/swagger'
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator'

export class UpdateUserDto {
  @ApiProperty({
    description: 'Nome completo do usuário',
    required: false,
    example: 'João Silva',
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'O nome não pode ser vazio' })
  name?: string

  @ApiProperty({
    description: 'Número de telefone do usuário',
    required: false,
    example: '+244999999999',
  })
  @IsOptional()
  @IsString()
  telefone?: string

  @ApiProperty({
    description: 'Email do usuário',
    required: false,
    example: 'usuario@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Insira um email válido' })
  email?: string
}
