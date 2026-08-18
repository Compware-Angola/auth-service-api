import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName } from 'src/common/constants/queue.constant';
import type { AccessLogOutcome } from 'src/common/enums/log-outcome.enum';
import type { TargetResource } from 'src/common/constants/log-action.constant';
import { CreateAccessLogDto } from './dto/create-access-log.dto';

export interface BuildAccessLogParams {
  serviceName: string;
  module: string;
  action: string;
  actionDescription?: string;
  targetResource?: TargetResource;
  outcome: AccessLogOutcome;
  outcomeDetail?: string;
  timestamp?: Date;
  statusCode?: number;
  responseTimeMs?: number;
  userId?: string;
  userName?: string;
  ip?: string;
  requestId: string;
  method?: string;
  path?: string;
}

@Injectable()
export class AccessLogService {
  private readonly logger = new Logger(AccessLogService.name);

  constructor(
    @InjectQueue(QueueName.ACCESS_LOGS)
    private readonly accessLogsQueue: Queue<CreateAccessLogDto>,
  ) {}

  /**
   * Publica o log na queue Redis partilhada (não-bloqueante).
   * O audit-log-service consome e persiste em batch no MongoDB.
   */
  async enqueue(log: CreateAccessLogDto): Promise<void> {
    try {
      await this.accessLogsQueue.add('log', log, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: true,
        removeOnFail: 10_000,
      });
    } catch (error) {
      this.logger.error(
        `Falha ao enfileirar log de acesso: ${(error as Error).message}`,
      );
    }
  }

  buildLog(params: BuildAccessLogParams): CreateAccessLogDto {
    const log = new CreateAccessLogDto();
    log.serviceName = params.serviceName;
    log.module = params.module;
    log.action = params.action;
    log.actionDescription = params.actionDescription;
    log.targetResource = params.targetResource;
    log.outcome = params.outcome;
    log.outcomeDetail = params.outcomeDetail;
    log.timestamp = params.timestamp ?? new Date();
    log.statusCode = params.statusCode;
    log.responseTimeMs = params.responseTimeMs;
    log.userId = params.userId;
    log.userName = params.userName;
    log.ip = params.ip;
    log.requestId = params.requestId;
    log.method = params.method;
    log.path = params.path;
    return log;
  }
}
