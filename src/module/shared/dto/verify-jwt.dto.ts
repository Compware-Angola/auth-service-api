import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyJwtDto {
  @ApiProperty({ example: 'senha123' })
  @IsNotEmpty() @IsString() texto: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...' })
  @IsNotEmpty() @IsString() token: string;
}