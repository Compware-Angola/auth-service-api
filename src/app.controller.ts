import {
  Body,
  Controller,
  Post,
  HttpException,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { HashService } from './app.service';
import { JwtService } from '@nestjs/jwt';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,

} from '@nestjs/swagger';
import { HashDto } from './module/shared/dto/hash.dto';
import { LoginFromDbDto } from './module/shared/dto/login-from-db.dto';
import { TokenResponse } from './module/shared/dto/token-response';
import { VerifyResponse } from './module/shared/dto/verify-response.dto';
import { VerifyJwtDto } from './module/shared/dto/verify-jwt.dto';
import { VerifyOldDto } from './module/shared/dto/verify-old.dto';









@ApiTags('HASH')
@Controller()
export class HashController {
  constructor(
    private readonly hashService: HashService,
    private readonly jwtService: JwtService,
  ) { }

  // 1. Gerar hash (primeira vez, para guardar na BD)
  @Post('hash')
  @ApiOperation({ summary: 'Gerar hash bcrypt (guarda isto na tua BD)' })
  async gerarHash(@Body() body: HashDto) {
    const hash = await this.hashService.criarHash(body.texto);
    return { hash };
  }

  // 2. Login REAL: compara com hash da BD → gera JWT
  @Post('login')
  @ApiOperation({
    summary: 'LOGIN: manda senha + hash da BD → recebe JWT se correto'
  })
  @ApiBody({
    description: 'Hash vem da tua BD, texto é o que o user digitou',
    type: LoginFromDbDto
  })
  @ApiResponse({ status: 200, type: TokenResponse })
  @ApiResponse({ status: 401, description: 'Senha errada' })
  async login(@Body() body: LoginFromDbDto) {
    const correto = await this.hashService.verificarHash(body.texto, body.hash_da_bd);
    if (!correto) {
      throw new HttpException('Senha inválida', HttpStatus.UNAUTHORIZED);
    }

    // Gera JWT com o hash da BD dentro (para usar depois sem BD)
    const payload = { hash: body.hash_da_bd };
    const token = this.jwtService.sign(payload, { expiresIn: '15m' });

    return {
      access_token: token,
      expires_in: 21600,
      mensagem: 'Login sucesso! Usa este JWT nas próximas chamadas.',
    };
  }

  // 3. Verificar com JWT (sem tocar na BD novamente)
  @Post('verify-jwt')
  @ApiOperation({
    summary: 'Verificar senha usando apenas JWT (stateless)'
  })
  @ApiBody({ type: VerifyJwtDto })
  @ApiResponse({ status: 200, type: VerifyResponse })
  async verifyJwt(@Body() body: VerifyJwtDto) {
    try {
      const decoded = this.jwtService.verify(body.token);
      const hashNoToken = decoded.hash;
      const valid = await this.hashService.verificarHash(body.texto, hashNoToken);
      return { valid };
    } catch (err) {
      throw new HttpException('Token inválido ou expirado', HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('verify')
  @ApiOperation({
    summary: 'Verifica se o hash corresponde ao texto fornecido',
    description: 'Recebe um texto em claro e um hash previamente gerado. Compara-os usando o algoritmo configurado (SHA-256, bcrypt, argon2, etc.) e retorna true/false.',
  })
  @ApiBody({ type: VerifyOldDto })
  @ApiResponse({ status: 200 })
  async verifyOld(@Body() body: VerifyOldDto) {
    const valid = await this.hashService.verificarHash(body.texto, body.hash);
    return { valid };
  }

  @Get()
  @ApiOperation({
    summary: '🏠 Página inicial – Status da API',
    description: `
🔥 **SERVIÇO DE AUTENTICAÇÃO STATELESS PRONTO!**

### Fluxo completo da API:
1. **POST /hash** → Recebe texto → Gera hash → Guarda na BD → Retorna o hash  
2. **POST /login** → Recebe texto + hash_da_bd → Verifica → Gera JWT  
3. **POST /verify-jwt** → Recebe texto + JWT → Valida assinatura e payload  

### Links úteis:
- Documentação Swagger: **/api**  
- Health check: **GET /** (esta rota)

Tudo pronto para produção! 🚀
  `.trim(),
  })
  @ApiResponse({
    status: 200,
    description: 'API online e pronta para uso',
    schema: {
      type: 'object',
      properties: {
        mensagem: {
          type: 'string',
          example: '🔥 SERVIÇO DE AUTENTICAÇÃO STATELESS PRONTO!',
        },
        fluxo: {
          type: 'string',
          example: '1. /hash → guarda na BD | 2. /login (texto + hash_da_bd) → JWT | 3. /verify-jwt (texto + JWT)',
        },
        docs: {
          type: 'string',
          example: '/api',
        },
      },
    },
  })
  root() {
    return {
      mensagem: '🔥 SERVIÇO DE AUTENTICAÇÃO STATELESS PRONTO!',
      fluxo: '1. /hash → guarda na BD | 2. /login (texto + hash_da_bd) → JWT | 3. /verify-jwt (texto + JWT)',
      docs: '/api',
    };
  }
}