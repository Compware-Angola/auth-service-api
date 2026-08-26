import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IdentityAuthService } from './identity-auth.service';
import { IdentityLoginDto } from './dto/identity-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

/**
 * Rotas do NOVO modelo de auth (Identity + Platform Access).
 * Completamente separadas de /auth (src/module/auth) — que continua a
 * funcionar exactamente como está, para os projectos que ainda dependem
 * da estrutura antiga (GA, PORTAL, PEOPLE_MANAGEMENT).
 */
@ApiTags('AUTH-V2')
@Controller('auth/v2')
export class IdentityAuthController {
  constructor(private readonly identityAuthService: IdentityAuthService) {}

  @Post('login')
  @ApiOperation({
    summary:
      'Login pelo novo modelo de identidade central (GLOBAL_TB_IDENTITY + Platform Access)',
  })
  @ApiBody({ type: IdentityLoginDto })
  @ApiResponse({ status: 200, description: 'Login efectuado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  @ApiResponse({
    status: 403,
    description: 'Identidade inativa ou sem acesso à plataforma informada.',
  })
  login(@Body() dto: IdentityLoginDto) {
    return this.identityAuthService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Renova o access token a partir de um refresh token válido',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Token renovado com sucesso.' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido, expirado ou revogado.',
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.identityAuthService.refresh(dto);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoga um refresh token (termina a sessão)' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Sessão terminada com sucesso.' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.identityAuthService.logout(dto);
  }
}
