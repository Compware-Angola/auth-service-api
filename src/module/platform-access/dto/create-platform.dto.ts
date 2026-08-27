import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePlatformDto {
  @ApiProperty({ example: 'INVOICE', description: 'Código único da plataforma' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Invoice', description: 'Nome da plataforma' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    example: 'Sistema de facturação',
    description: 'Descrição da plataforma',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
