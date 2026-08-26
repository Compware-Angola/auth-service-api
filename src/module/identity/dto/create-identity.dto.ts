import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

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
}
