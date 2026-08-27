import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class IdentityLoginDto {
  @ApiProperty({
    example: 'manasses.gomes',
    description: 'Username ou email da identidade',
  })
  @IsNotEmpty()
  @IsString()
  identifier: string;

  @ApiProperty({ example: 'SenhaForte#123', description: 'Senha da identidade' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({
    example: 'INVOICE',
    description:
      'Código da plataforma a validar (opcional). Se informado, o login falha caso a identidade não tenha acesso a essa plataforma.',
    required: false,
  })
  @IsOptional()
  @IsString()
  platformCode?: string;
}
