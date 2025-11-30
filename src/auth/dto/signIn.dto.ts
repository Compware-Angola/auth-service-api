import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

export enum AuthPlatform {
  GA = 'GA',
  PORTAL = 'PORTAL',
}

export class SignInDto {
  @ApiProperty({ 
    example: 'manasses.gomes', 
    description: 'Nome de usuário para login' 
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ 
    example: 'root_teste', 
    description: 'Senha do usuário para login' 
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({
    example: 'GA',
    description: 'Plataforma de autenticação',
    enum: AuthPlatform,
  })
  @IsNotEmpty()
  @IsEnum(AuthPlatform)
  platform: AuthPlatform;
}
