import { Controller, Post, Body } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signIn.dto';
import { CheckEmailExistsDto } from './dto/check-email-exists';
import { ResetPasswordDto } from './dto/reset-password';

@ApiTags('AUTH')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login do utilizador' })
  @ApiResponse({ status: 200, description: 'Login efectuado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  @ApiBody({ type: SignInDto })
  async signIn(@Body() signInDto:SignInDto) {
    return this.authService.signIn(signInDto);
  }


@Post('check-email')
@ApiOperation({ summary: 'Verifica se o e-mail existe na plataforma especificada' })
@ApiResponse({ status: 200, description: 'E-mail verificado com sucesso.' })
@ApiResponse({ status: 404, description: 'E-mail não encontrado.' })
@ApiBody({ type: CheckEmailExistsDto })
async checkEmailExists(@Body() checkEmailExistsDto: CheckEmailExistsDto) {
  return this.authService.checkEmailExists(checkEmailExistsDto);
}
@Post('send-change-password')
@ApiOperation({ summary: 'Envia um e-mail para redefinição de senha' })
@ApiResponse({ status: 200, description: 'E-mail de redefinição de senha enviado com sucesso.' })
@ApiResponse({ status: 404, description: 'E-mail não encontrado.' })
@ApiBody({ type: CheckEmailExistsDto })
async sendChangePasswordEmail(@Body() checkEmailExistsDto: CheckEmailExistsDto) {
  return this.authService.SendchangePassword(checkEmailExistsDto);
}

@Post('reset-password')
@ApiOperation({ summary: 'Redefine a senha do usuário usando o token enviado por e-mail' })
@ApiResponse({ status: 200, description: 'Senha redefinida com sucesso.' })
@ApiResponse({ status: 400, description: 'Token inválido ou expirado.' })
@ApiBody({ type: ResetPasswordDto })
async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
  return this.authService.resetPassword(resetPasswordDto);
}
}
