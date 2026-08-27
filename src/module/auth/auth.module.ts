import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HashService } from 'src/app.service';
import { UserSignInService } from './users.signIn.service';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicYear } from 'src/util/entities/academic.year.entity';
import { AnoLectivoUtil } from 'src/util/current-academic-year';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicYear]),
  HttpModule.register({
    timeout: 5000,
    maxRedirects: 5
  }),
  BullModule.registerQueue({
    name: 'operator_box',
  }),

  ],
  controllers: [AuthController],
  providers: [AuthService, HashService, UserSignInService, AnoLectivoUtil],

})
export class AuthModule { }
