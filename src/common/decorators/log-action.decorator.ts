import { applyDecorators, SetMetadata } from '@nestjs/common';
import {
  LOG_ACTION_METADATA,
  LogActionMetadata,
} from '../constants/log-action.constant';

export type LogActionOptions = Omit<LogActionMetadata, 'action'>;

/**
 * Decorator para aplicar em métodos de controllers (ou na própria classe).
 *
 * Exemplos:
 *   @LogAction(AccessLogAction.CRIAR_UTILIZADOR, 'UsersController')
 *   @LogAction('CREATE_USER', 'Users', 'Criação de um novo utilizador')
 *   @LogAction('DELETE_ORDER', { module: 'Orders', targetResourceType: 'Order', actionDescription: 'Remoção de encomenda' })
 */
export function LogAction(
  action: string,
  moduleOrOptions?: string | LogActionOptions,
  actionDescription?: string,
): MethodDecorator & ClassDecorator {
  const metadata: LogActionMetadata = { action };

  if (typeof moduleOrOptions === 'string') {
    metadata.module = moduleOrOptions;
    if (actionDescription) {
      metadata.actionDescription = actionDescription;
    }
  } else if (moduleOrOptions) {
    Object.assign(metadata, moduleOrOptions);
  }

  return applyDecorators(SetMetadata(LOG_ACTION_METADATA, metadata));
}
