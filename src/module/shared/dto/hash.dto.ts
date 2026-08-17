import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
// DTOs
export class HashDto {
  @ApiProperty({
    example: 'senha123',
    description: 'Texto para gerar hash (primeira vez)',
  })
  @IsNotEmpty()
  @IsString()
  texto: string;
}
