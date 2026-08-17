import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ACCESS_LOGS_QUEUE } from 'src/common/constants/log-action.constant';
import { AccessLogService } from './access-log.service';
import { AccessLogInterceptor } from './interceptors/access-log.interceptor';

/**
 * Módulo de envio de logs de acesso para o audit-log-service.
 *
 * O interceptor é registado globalmente (APP_INTERCEPTOR) e publica os logs
 * na queue Redis partilhada `{BULL_PREFIX}:access-logs` — o audit-log-service
 * consome essa queue e persiste no MongoDB. Este serviço NÃO tem processor
 * nem ligação ao MongoDB: apenas produz.
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: ACCESS_LOGS_QUEUE,
    }),
  ],
  providers: [
    AccessLogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AccessLogInterceptor,
    },
  ],
  exports: [AccessLogService],
})
export class AccessLogModule {}
