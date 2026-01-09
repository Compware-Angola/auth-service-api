import { Controller, Post, Body, Get, Param, UseGuards, Req, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthPlatform, SignInDto } from './dto/signIn.dto';
import { CheckEmailExistsDto } from './dto/check-email-exists';
import { ResetPasswordDto } from './dto/reset-password';
import { SendRenewDataDto } from './dto/send-renew-data.dto';
import { GetCurrentPlataformDto } from './dto/get-plataform-user';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';

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

@Get('current-user')
@UseGuards(JwtAuthGuard) 
@ApiBearerAuth('JWT-auth')
@ApiOperation({ summary: 'Obtém informações do usuário atual em uma plataforma específica' })
@ApiQuery({
  name: 'platform',
  enum: AuthPlatform,
  description: 'Plataforma para consultar os dados do usuário',
  example: AuthPlatform.GA,
  required: true,
})
@ApiResponse({ status: 200, description: 'Informações obtidas com sucesso.' })
@ApiResponse({ status: 400, description: 'Platform inválida ou ausente.' })
@ApiResponse({ status: 401, description: 'Não autorizado.' })
async getCurrentUser(
  @Query() query: GetCurrentPlataformDto,
  @Req() req: any,
) {
  const userPayload = req.user; 
 

  // Passe os dois: o payload do JWT + a platform escolhida
  return this.authService.getCurrentUser(userPayload, query);
}
@Get('validate-token')
@UseGuards(JwtAuthGuard) 
@ApiBearerAuth('JWT-auth')
validateToken(
  @Req() req: any,) {
     const userPayload = req.user; 

    return { valid: true, user: userPayload };

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
@Post('send-renew-data')
@ApiOperation({ summary: 'Envia uma solicitação para renovação de dados cadastrais' })
@ApiResponse({ status: 200, description: 'Solicitação enviada com sucesso.' })
@ApiResponse({ status: 400, description: 'Erro ao enviar a solicitação.' })
@ApiBody({ type: SendRenewDataDto })
async sendRenewData(@Body() sendRenewDataDto: SendRenewDataDto) {
  return this.authService.sendRenewData(sendRenewDataDto);
}


}
