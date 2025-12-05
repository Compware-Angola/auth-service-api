// src/hash/dto/verify-old.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyOldDto {
  @IsString({ message: 'texto deve ser uma string' })
  @IsNotEmpty({ message: 'texto é obrigatório' })
  @ApiProperty({ example: 'Olá mundo', description: 'Texto original' })
  texto: string;

  @IsString({ message: 'hash deve ser uma string' })
  @IsNotEmpty({ message: 'hash é obrigatório' })
  @ApiProperty({
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    description: 'Hash a ser verificado',
  })
  hash: string;
}