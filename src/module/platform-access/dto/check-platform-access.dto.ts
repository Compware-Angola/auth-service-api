import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CheckPlatformAccessDto {
  @ApiProperty({ example: 123, description: 'ID da identidade do utilizador' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  userId: number;

  @ApiProperty({ example: 'INVOICE', description: 'Código da plataforma' })
  @IsNotEmpty()
  @IsString()
  platformCode: string;
}
