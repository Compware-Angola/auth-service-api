import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Req,
  Query,
  Put,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  AuthPlatform,
  LogoutDto,
  MakloggedOutDto,
  SignInDto,
} from './dto/signIn.dto';
import { CheckEmailExistsDto } from './dto/check-email-exists';
import { ResetPasswordDto } from './dto/reset-password';
import { SendRenewDataDto } from './dto/send-renew-data.dto';
import { GetCurrentPlataformDto } from './dto/get-plataform-user';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { ActiveUserGuard } from '../guard/active-user.guard';
import { LogAction, SkipLog } from 'src/common/decorators/log-action.decorator';
import { AccessLogAction } from 'src/common/enum/application.university-academic';
import { UserUpdatePasswordDto } from './dto/user-update-password';

@ApiTags('AUTH')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @LogAction(
    AccessLogAction.LOGIN,
    'AuthController',
    'Autenticação do utilizador',
  )
  @ApiOperation({ summary: 'Login do utilizador' })
  @ApiResponse({ status: 200, description: 'Login efectuado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  @ApiBody({ type: SignInDto })
  async signIn(@Body() signInDto: SignInDto, @Req() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    // Sem token no login — identifica a tentativa pelo username do body
    // (útil também quando as credenciais falham e nada é retornado)
    req.headers['x-user-name'] = signInDto.username;

    const login = await this.authService.signIn(signInDto, ip);

    // Login com sucesso: anexa a identidade resolvida ao request para que o
    // interceptor de logs registe userId e userName da pessoa autenticada
    const user = login.user;
    req.user = {
      sub: user?.pk_utilizador ?? user?.id ?? user?.codigo,
      nome: user?.nome ?? user?.name ?? user?.nome_completo,
      username: user?.username ?? signInDto.username,
    };

    return login;
  }
  @Get('current-user')
  @UseGuards(JwtAuthGuard)
  @SkipLog()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtém informações do usuário atual em uma plataforma específica',
  })
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
  async getCurrentUser(@Req() req: any) {
    const userPayload = req.user;
    return this.authService.getCurrentUser(userPayload);
  }

  @Put('update-password')
  @UseGuards(JwtAuthGuard)
  @LogAction(
    'UPDATE_PASSWORD',
    'AuthController',
    'Atualização da senha do utilizador autenticado',
  )
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Atualiza a senha do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Senha atualizada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Erro na atualização da senha.' })
  @ApiBody({ type: UserUpdatePasswordDto })
  async updatePassword(
    @Req() req: any,
    @Body() updatePasswordDto: UserUpdatePasswordDto,
  ) {
    const userPayload = req.user;
    return this.authService.UserupdatePassword(
      updatePasswordDto,
      userPayload.sub,
    );
  }
  @SkipLog()
  @Get('validate-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  validateToken(@Req() req: any) {
    const userPayload = req.user;
    return { valid: true, user: userPayload };
  }
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('logout')
  @LogAction(
    AccessLogAction.UTILIZADORES_LOGADOS,
    'AuthController',
    'Terminar sessão do utilizador',
  )
  async logout(@Req() req: any, @Body() logoutDTO: LogoutDto) {
    const user = req.user;
    await this.authService.logout(logoutDTO, user.sub);
  }

  //@UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Patch('mak-logged-out/:utilizadorId')
  @LogAction('MAK_LOGGED_OUT', {
    module: 'AuthController',
    actionDescription: 'Terminar sessão de utilizador (admin)',
    targetResourceType: 'User',
  })
  async makloggedOut(
    @Param('utilizadorId') utilizadorId: number,
    @Body() query: MakloggedOutDto,
  ) {
    return await this.authService.makloggedOut(query, utilizadorId);
  }
  @Post('check-email')
  @ApiOperation({
    summary: 'Verifica se o e-mail existe na plataforma especificada',
  })
  @ApiResponse({ status: 200, description: 'E-mail verificado com sucesso.' })
  @ApiResponse({ status: 404, description: 'E-mail não encontrado.' })
  @ApiBody({ type: CheckEmailExistsDto })
  async checkEmailExists(@Body() checkEmailExistsDto: CheckEmailExistsDto) {
    return this.authService.checkEmailExists(checkEmailExistsDto);
  }
  @Post('send-change-password')
  @ApiOperation({ summary: 'Envia um e-mail para redefinição de senha' })
  @ApiResponse({
    status: 200,
    description: 'E-mail de redefinição de senha enviado com sucesso.',
  })
  @ApiResponse({ status: 404, description: 'E-mail não encontrado.' })
  @ApiBody({ type: CheckEmailExistsDto })
  async sendChangePasswordEmail(
    @Body() checkEmailExistsDto: CheckEmailExistsDto,
  ) {
    return this.authService.SendchangePassword(checkEmailExistsDto);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Redefine a senha do usuário usando o token enviado por e-mail',
  })
  @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso.' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado.' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
  @Post('send-renew-data')
  @ApiOperation({
    summary: 'Envia uma solicitação para renovação de dados cadastrais',
  })
  @ApiResponse({ status: 200, description: 'Solicitação enviada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Erro ao enviar a solicitação.' })
  @ApiBody({ type: SendRenewDataDto })
  async sendRenewData(@Body() sendRenewDataDto: SendRenewDataDto) {
    return this.authService.sendRenewData(sendRenewDataDto);
  }
}
