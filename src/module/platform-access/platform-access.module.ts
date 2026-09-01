import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Platform } from './entities/platform.entity';
import { UserPlatform } from './entities/user-platform.entity';
import { PlatformRepository } from './repositories/platform.repository';
import { UserPlatformRepository } from './repositories/user-platform.repository';
import { PlatformService } from './platform.service';
import { PlatformAccessService } from './platform-access.service';
import { PlatformController } from './platform.controller';
import { PlatformAccessController } from './platform-access.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Platform, UserPlatform])],
  controllers: [PlatformController, PlatformAccessController],
  providers: [
    PlatformRepository,
    UserPlatformRepository,
    PlatformService,
    PlatformAccessService,
  ],
  exports: [PlatformService, PlatformAccessService,],
})
export class PlatformAccessModule { }
