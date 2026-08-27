import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreatePlatformAccessDto {
  @ApiProperty({ example: 123, description: 'ID da identidade do utilizador' })
  @IsInt()
  @IsPositive()
  userId: number;

  @ApiProperty({ example: 'INVOICE', description: 'Código da plataforma' })
  @IsNotEmpty()
  @IsString()
  platformCode: string;
}
