import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateIdentityDto {
  @ApiProperty({
    example: 'manasses.gomes',
    description: 'Username único da identidade',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  username: string;

  @ApiProperty({
    example: 'manasses.gomes@uma.ao',
    description: 'Email único da identidade',
  })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(150)
  email: string;

  @ApiProperty({
    example: 'Manasses Gomes',
    description: 'Nome completo do utilizador',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    example: '004521547LA042',
    description: 'Número do Bilhete de Identidade (único)',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  bi: string;

  @ApiProperty({
    example: 'https://cdn.uma.ao/avatars/default.png',
    description: 'URL do avatar. Se omitido, é usado um avatar por omissão.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  avatar?: string;

  @ApiProperty({
    example: 'SenhaForte#123',
    description: 'Senha da identidade (será armazenada com hash)',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
