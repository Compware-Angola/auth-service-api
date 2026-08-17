import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HashService } from './app.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './jwt.constants';
import { HashController } from './app.controller';
import { AuthModule } from './module/shared/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { StudetsModule } from './module/users/users.module';
import { UserSignInService } from './module/shared/auth/users.signIn.service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from './module/shared/guard/Custom-Throttler.guard';
import { BullConfigModule } from './module/shared/bull/bull.module';
import { AccessLogModule } from './module/access-log/access-log.module';
import { databaseOptionsFactory } from './common/config/database.factory';
import { mailerOptionsFactory } from './common/config/mailer.factory';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: (() => {
        switch (process.env.NODE_ENV) {
          case 'production':
            return '.env.prod';
          case 'preprod':
            return '.env.preprod';
          default:
            return '.env.dev';
        }
      })(),
    }),
    // Configuração do ThrottlerModule para limitar a 5 pedidos por minuto
    /*
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // ✅ 60 segundos em milissegundos
        limit: 5,   // 5 pedidos por minuto
      },
    ]),
    */
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '12h' },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        databaseOptionsFactory(config, __dirname + '/**/*.entity{.ts,.js}'),
    }),
    // Configuração do Mailer (SMTP)
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: mailerOptionsFactory,
    }),
    AuthModule,
    StudetsModule,
    BullConfigModule,
    AccessLogModule,
  ],
  controllers: [HashController],
  providers: [
    HashService,
    UserSignInService,
    /*
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    }
    */
  ],
})
export class AppModule {}
