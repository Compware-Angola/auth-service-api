import { randomUUID } from 'crypto';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IdentityService } from '../identity/identity.service';
import { PlatformAccessService } from '../platform-access/platform-access.service';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { IdentityLoginDto } from './dto/identity-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRES_IN = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class IdentityAuthService {
  constructor(
    private readonly identityService: IdentityService,
    private readonly platformAccessService: PlatformAccessService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
  ) { }

  async login(dto: IdentityLoginDto) {
    const identity = await this.identityService.validateUserCredentials(
      dto.identifier,
      dto.password,
      dto.platformCode,
    );
    console.log(identity, "========================================");

    if (dto.platformCode) {
      const hasAccess = await this.platformAccessService.hasAccess(
        identity.id,
        dto.platformCode,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          `Identidade sem acesso à plataforma "${dto.platformCode}".`,
        );
      }
    }

    const tokens = await this.issueTokens(
      identity.id,
      identity.username,
      identity.email,
      identity.bi || '',
      dto.platformCode,
      identity.userPlatforms[0].platformUserKey || '',
    );

    return {
      ...tokens,
      identity: { ...identity, password: undefined },
      ...(dto.platformCode && {
        platformAccess: { platformCode: dto.platformCode, hasAccess: true },
      }),
      message: 'Login efectuado com sucesso.',
    };
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.refresh_token);
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    if (payload.type !== 'refresh' || !payload.jti) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    const stored = await this.refreshTokenRepository.findByTokenId(
      payload.jti,
    );
    if (!stored || stored.revoked === 1 || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    const identity = await this.identityService.findById(stored.identityId);
    if (identity.status !== 1) {
      throw new ForbiddenException('Identidade inativa.');
    }

    // Rotação: o token usado é revogado e um novo par é emitido.
    await this.refreshTokenRepository.revoke(stored.tokenId);

    const tokens = await this.issueTokens(
      identity.id,
      identity.username,
      identity.email,
      identity.bi || '',
      stored.platformCode,
    );

    return {
      ...tokens,
      identity: { ...identity, password: undefined },
      message: 'Token renovado com sucesso.',
    };
  }

  async logout(dto: RefreshTokenDto): Promise<{ message: string }> {
    const payload = this.jwtService.decode(dto.refresh_token) as any;
    if (payload?.jti) {
      await this.refreshTokenRepository.revoke(payload.jti);
    }
    return { message: 'Sessão terminada com sucesso.' };
  }

  private async issueTokens(
    identityId: number,
    username: string,
    email: string,
    bi?: string,
    platformCode?: string,
    platformUserKey?: string,
  ) {
    const access_token = this.jwtService.sign(
      { sub: identityId, username, email, bi, platform: platformCode, platformUserKey },
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
    );

    const tokenId = randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.refreshTokenRepository.create({
      identityId,
      tokenId,
      platformCode,
      expiresAt,
      revoked: 0,
    });

    const refresh_token = this.jwtService.sign(
      { sub: identityId, jti: tokenId, type: 'refresh' },
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN },
    );

    return {
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    };
  }
}
