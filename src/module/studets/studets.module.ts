import { Module } from '@nestjs/common';
import { StudetsService } from './studets.service';
import { StudetsController } from './studets.controller';
import { HashService } from 'src/hash.service';

@Module({
  controllers: [StudetsController],
  providers: [StudetsService,HashService],
})
export class StudetsModule {}
