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
      signOptions: { expiresIn: '6h' },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isSSL = config.get<string>('DB_SSL') === 'true';
        return {
          type: 'oracle' as const,
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT', 1521),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          sid: config.get<string>('DB_SID'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: false,
          logging: ['query', 'error'],
          extra: {
            disableInsertDefaultValues: true,
            ...(isSSL ? { ssl: { rejectUnauthorized: true } } : {}),
          },
        };
      },
    }),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAIL_HOST'),
          port: config.get<number>('MAIL_PORT'),
          secure: config.get<string>('MAIL_SECURE') === 'true',
          auth: {
            user: config.get<string>('MAIL_USER'),
            pass: config.get<string>('MAIL_PASS'),
          },
          options: {
            connectionTimeout: 60000,
          },
        },
        defaults: {
          from: `"Suporte Uma" <${config.get<string>('MAIL_USER')}>`,
        },
      }),
    }),
    AuthModule,
    StudetsModule,
    BullConfigModule
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
export class AppModule { }