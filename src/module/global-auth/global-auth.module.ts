import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityModule } from '../identity/identity.module';
import { PlatformAccessModule } from '../platform-access/platform-access.module';
import { RefreshToken } from './entities/refresh-token.entity';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { IdentityAuthService } from './global-auth.service';
import { IdentityAuthController } from './global-auth.controller';

@Module({
  imports: [
    IdentityModule,
    PlatformAccessModule,
    TypeOrmModule.forFeature([RefreshToken]),
  ],
  controllers: [IdentityAuthController],
  providers: [IdentityAuthService, RefreshTokenRepository],
})
export class IdentityAuthModule { }
