export const LOG_ACTION_METADATA = 'log-action:metadata';

export const SKIP_LOG_METADATA = 'log-action:skip';

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
