export const LOG_ACTION_METADATA = 'log-action:metadata';

export const ACCESS_LOGS_QUEUE = 'access-logs';

export interface LogActionMetadata {
  action: string;
  module?: string;
  actionDescription?: string;
  targetResourceType?: string;
}

export interface TargetResource {
  type: string;
  id: string;
}
