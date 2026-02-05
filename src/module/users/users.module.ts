import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { HashService } from 'src/app.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService,HashService],
})
export class StudetsModule {}
