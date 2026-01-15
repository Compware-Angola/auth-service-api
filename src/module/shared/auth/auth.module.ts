import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HashService } from 'src/hash.service';
import { UserSignInService } from './users.signIn.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService,HashService,UserSignInService],
  
})
export class AuthModule {}
