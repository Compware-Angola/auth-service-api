import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HashService } from 'src/app.service';
import { UserSignInService } from './users.signIn.service';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicYear } from 'src/util/entities/academic.year.entity';
import { AnoLectivoUtil } from 'src/util/current-academic-year';
import { BullConfigModule } from '../shared/bull/bull.module';
import { MailModule } from '../shared/mailer/mail.module';
import { AuthService as AuthService2 } from './services/auth.service'
import { AuthTokenService } from './services/auth-token.service';
import { PeopleManagementAuthService } from './strategies/people-management-auth.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([AcademicYear]),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    BullConfigModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, HashService, UserSignInService, AnoLectivoUtil, AuthService2, AuthTokenService, PeopleManagementAuthService],
})
export class AuthModule { }