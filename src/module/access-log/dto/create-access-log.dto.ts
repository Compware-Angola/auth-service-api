import type { TargetResource } from 'src/common/constants/log-action.constant';
import type { AccessLogOutcome } from 'src/common/enums/log-outcome.enum';

/**
 * Payload do log de acesso publicado na queue Redis partilhada
 * e consumido pelo audit-log-service.
 */
export class CreateAccessLogDto {
  serviceName: string;
  module: string;
  action: string;
  actionDescription?: string;
  targetResource?: TargetResource;
  outcome?: AccessLogOutcome;
  outcomeDetail?: string;
  timestamp?: Date;
  statusCode?: number;
  responseTimeMs?: number;
  userId?: string;
  userName?: string;
  ip?: string;
  requestId?: string;
  method?: string;
  path?: string;
}
