import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { bullConnectionFactory } from 'src/common/config/redis-connection.factory';
import {
  ACCESS_LOGS_QUEUE,
  OPERATOR_BOX_QUEUE,
} from 'src/common/constants/queue.constant';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: bullConnectionFactory,
    }),
    BullModule.registerQueue(
      { name: OPERATOR_BOX_QUEUE },
      { name: ACCESS_LOGS_QUEUE },
    ),
  ],
  exports: [BullModule],
})
export class BullConfigModule {}
