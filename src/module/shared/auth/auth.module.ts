import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HashService } from 'src/app.service';
import { UserSignInService } from './users.signIn.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports:[HttpModule.register({
    timeout: 5000,
    maxRedirects: 5
  })],
  controllers: [AuthController],
  providers: [AuthService,HashService,UserSignInService],
  
})
export class AuthModule {}
