import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { OmitType } from '@nestjs/mapped-types';
export enum AuthPlatform {
  GA = 'GA',
  PORTAL = 'PORTAL',
  PEOPLE_MANAGEMENT = 'PEOPLE_MANAGEMENT',
  PEOPLE_MANAGEMENT_PORTAL = 'PEOPLE_MANAGEMENT_PORTAL',
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

export class SignInDtoWithOutPlatform extends OmitType(SignInDto, ['platform']) { }



export class LogoutDto {


  @ApiProperty({
    example: 'GA',
    description: 'Plataforma de autenticação',
    enum: AuthPlatform,
  })
  @IsNotEmpty()
  @IsEnum(AuthPlatform)
  platform: AuthPlatform;
}

export class MakloggedOutDto {


  @ApiProperty({
    example: 'GA',
    description: 'Plataforma de autenticação',
    enum: AuthPlatform,
  })
  @IsNotEmpty()
  @IsEnum(AuthPlatform)
  platform: AuthPlatform;
}
