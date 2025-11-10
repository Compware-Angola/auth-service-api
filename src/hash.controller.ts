import {
  Body,
  Controller,
  Post,
  HttpException,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { HashService } from './hash.service';
import { JwtService } from '@nestjs/jwt';
import { IsNotEmpty, IsString } from 'class-validator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { HashDto } from './dto/hash.dto';
import { LoginFromDbDto } from './dto/login-from-db.dto';
import { TokenResponse } from './dto/token-response';
import { VerifyResponse } from './dto/verify-response.dto';
import { VerifyJwtDto } from './dto/verify-jwt.dto';









@ApiTags('auth')
@Controller()
export class HashController {
  constructor(
    private readonly hashService: HashService,
    private readonly jwtService: JwtService,
  ) {}

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
      expires_in: 900,
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
      const valido = await this.hashService.verificarHash(body.texto, hashNoToken);
      return { valido };
    } catch (err) {
      throw new HttpException('Token inválido ou expirado', HttpStatus.UNAUTHORIZED);
    }
  }

  // Rota antiga (opcional)
  @Post('verify')
  async verifyOld(@Body() body: { texto: string; hash: string }) {
    const valido = await this.hashService.verificarHash(body.texto, body.hash);
    return { valido };
  }

  @Get()
  root() {
    return {
      mensagem: '🔥 SERVIÇO DE AUTENTICAÇÃO STATELESS PRONTO!',
      fluxo: '1. /hash → guarda na BD | 2. /login (texto + hash_da_bd) → JWT | 3. /verify-jwt (texto + JWT)',
      docs: '/api',
    };
  }
}