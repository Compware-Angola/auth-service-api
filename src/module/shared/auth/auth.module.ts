import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HashService } from 'src/hash.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService,HashService],
  
})
export class AuthModule {}
