import { IsNotEmpty, IsString, MinLength, Matches, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuthPlatform } from './signIn.dto';

const SENHA_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;:',.<>/?~])[A-Za-z\d!@#$%^&*()_+\-=[\]{}|;:',.<>/?~]+$/;
const SENHA_MSG = 'A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um símbolo';

export class UserUpdatePasswordDto {

  @ApiProperty({ example: 'SenhaAntiga@2024', description: 'Senha atual' })
  @IsString()
  @IsNotEmpty({ message: 'A senha antiga é obrigatória' })
  senhaAtual!: string;

  @ApiProperty({
    example: 'NovaSenha@2025',
    minLength: 8,
    description: 'Nova senha (mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 símbolo)',
  })
  @IsString()
  @IsNotEmpty({ message: 'A nova senha é obrigatória' })
  @MinLength(8, { message: 'A nova senha deve ter no mínimo 8 caracteres' })
  @Matches(SENHA_REGEX, { message: SENHA_MSG })
  novaSenha!: string;

  @ApiProperty({ example: 'NovaSenha@2025', description: 'Confirmação da nova senha' })
  @IsString()
  @IsNotEmpty({ message: 'A confirmação da senha é obrigatória' })
  confirmarNovaSenha!: string;
    @ApiProperty({
      example: 'GA',
      description: 'Plataforma de autenticação',
      enum: AuthPlatform,
    })
    @IsNotEmpty()
    @IsEnum(AuthPlatform)
    platform!: AuthPlatform.GA;
}