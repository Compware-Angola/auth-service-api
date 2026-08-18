import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { bullConnectionFactory } from 'src/common/config/redis-connection.factory';
import { QueueName } from 'src/common/constants/queue.constant';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: bullConnectionFactory,
    }),
    BullModule.registerQueue(
      { name: QueueName.OPERATOR_BOX },
      { name: QueueName.ACCESS_LOGS },
    ),
  ],
  exports: [BullModule],
})
export class BullConfigModule {}
