
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
class PlatformAccessDto {
  @ApiProperty({
    example: 'GA',
    description: 'Código da plataforma',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  platformCode: string;
  @ApiProperty({
    example: '1',
    description: 'Chave da plataforma',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  platformUserKey: string;
}
export class CreateIdentityDto {


  @ApiProperty({
    example: 'manasses.gomes@uma.ao',
    description: 'Email único da identidade',
  })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(150)
  email: string;

  @ApiProperty({
    example: 'Manasses',
    description: 'Primeiro nome do utilizador',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName: string;
  @ApiProperty({
    example: 'Gomes',
    description: 'Último nome do utilizador',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastName: string;
  @ApiProperty({
    example: '+244923000000',
    description: 'Número de telefone do utilizador',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
  @ApiProperty({
    example: '004521547LA042',
    description: 'Número do Bilhete de Identidade (único)',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  bi: string;
  @ApiProperty({
    example: 'https://cdn.uma.ao/avatars/default.png',
    description: 'URL ou caminho do avatar. Se omitido, será usado o avatar por omissão.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatar?: string;

  @ApiProperty({
    example: 'SenhaForte#123',
    description: 'Senha da identidade (será armazenada com hash)',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
  @ApiProperty({
    example: [
      {
        platformCode: 'GA',
        platformUserKey: '1',

      },
      {
        platformCode: 'GP',
        platformUserKey: '2',
      },
    ],
    description: 'Lista de plataformas',
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlatformAccessDto)
  platforms: PlatformAccessDto[];
}

