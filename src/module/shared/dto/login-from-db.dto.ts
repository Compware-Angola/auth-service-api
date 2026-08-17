import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginFromDbDto {
  @ApiProperty({ example: 'senha123', description: 'Senha que o user digitou' })
  @IsNotEmpty()
  @IsString()
  texto: string;

  @ApiProperty({
    example: '$2b$12$...',
    description: 'Hash que está na tua BD',
  })
  @IsNotEmpty()
  @IsString()
  hash_da_bd: string;
}
