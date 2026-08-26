import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HashService } from 'src/app.service';
import { Identity } from './entities/identity.entity';
import { IdentityRepository } from './repositories/identity.repository';
import { IdentityService } from './identity.service';
import { IdentityController } from './identity.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Identity])],
  controllers: [IdentityController],
  providers: [IdentityRepository, IdentityService, HashService],
  exports: [IdentityService],
})
export class IdentityModule {}
