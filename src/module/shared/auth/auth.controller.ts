import { Controller, Post, Body, Get, Param, UseGuards, Req, Query, Put, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthPlatform, LogoutDto, MakloggedOutDto, SignInDto } from './dto/signIn.dto';
import { CheckEmailExistsDto } from './dto/check-email-exists';
import { ResetPasswordDto } from './dto/reset-password';
import { SendRenewDataDto } from './dto/send-renew-data.dto';
import { GetCurrentPlataformDto } from './dto/get-plataform-user';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { ActiveUserGuard } from '../guard/active-user.guard';
import { AccessLogHelper } from 'src/common/helpers/access-log.helper';
import { HttpService } from '@nestjs/axios';

@ApiTags('AUTH')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private httpService: HttpService) { }

  @Post('login')
  @ApiOperation({ summary: 'Login do utilizador' })
  @ApiResponse({ status: 200, description: 'Login efectuado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  @ApiBody({ type: SignInDto })
  async signIn(@Body() signInDto: SignInDto, @Req() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const login = await this.authService.signIn(signInDto, ip);

    if (signInDto.platform == AuthPlatform.GA) {
     
      
     await AccessLogHelper.logAccess(this.httpService, {
        descricao: `Utilizador ${login?.user?.nome} fez login com sucesso`,
        fkUtilizadorResponsavel: login.user.pk_utilizador,
        fkOperacaoLog: 7,
        ip: req.ip,
      });

    }

    return login
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
    console.log(userPayload);
    

    return this.authService.getCurrentUser(userPayload, query);
  }
  @Get('validate-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)

  @ApiBearerAuth('JWT-auth')
  validateToken(
    @Req() req: any,) {
    const userPayload = req.user;
    return { valid: true, user: userPayload };

  }
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('logout')
  async logout(@Req() req: any, @Body() logoutDTO: LogoutDto) {
    const user = req.user;
     await this.authService.logout(
      logoutDTO,
      user.sub
    );

        if (logoutDTO.platform == AuthPlatform.GA) {
     
      
     await AccessLogHelper.logAccess(this.httpService, {
        descricao: `Utilizador ${user?.nome} Terminou Sessão`,
        fkUtilizadorResponsavel: user.sub,
        fkOperacaoLog: 7,
        ip: req.ip,
      });

    }
  }

  //@UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Patch('mak-logged-out/:utilizadorId')
  async makloggedOut(@Param('utilizadorId') utilizadorId: number, @Body() query: MakloggedOutDto,) {

    return await this.authService.makloggedOut(query, utilizadorId);
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
