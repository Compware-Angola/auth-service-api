import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Observable, tap } from 'rxjs';
import { randomUUID } from 'node:crypto';
import {
  LOG_ACTION_METADATA,
  type LogActionMetadata,
} from 'src/common/constants/log-action.constant';
import { AccessLogOutcome } from 'src/common/enums/log-outcome.enum';
import { AccessLogService } from '../access-log.service';
import type { JwtPayload } from '../../shared/auth/types/jwt-payload.interface';

interface RequestLike {
  method: string;
  originalUrl?: string;
  route?: { path?: string };
  headers: Record<string, string | string[] | undefined>;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  ip?: string;
  socket?: { remoteAddress?: string };
  user?: JwtPayload;
}

interface ResponseLike {
  statusCode: number;
}

@Injectable()
export class AccessLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AccessLogInterceptor.name);
  private readonly serviceName: string;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly accessLogService: AccessLogService,
  ) {
    this.serviceName =
      this.configService.get<string>('SERVICE_NAME') ?? 'auth-service';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const startedAt = Date.now();
    const metadata = this.reflector.get<LogActionMetadata | undefined>(
      LOG_ACTION_METADATA,
      context.getHandler(),
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<ResponseLike>();
          this.enqueueLog(context, request, response, startedAt, metadata);
        },
        error: (error: unknown) => {
          const response = context.switchToHttp().getResponse<ResponseLike>();
          this.enqueueLog(
            context,
            request,
            response,
            startedAt,
            metadata,
            error,
          );
        },
      }),
    );
  }

  private enqueueLog(
    context: ExecutionContext,
    request: RequestLike,
    response: ResponseLike,
    startedAt: number,
    metadata?: LogActionMetadata,
    error?: unknown,
  ): void {
    const { outcome, outcomeDetail, statusCode } = this.resolveOutcome(
      error,
      response.statusCode,
    );

    const controllerName = context.getClass().name ?? 'UnknownController';
    const method = request.method;
    const path =
      (request.route as { path?: string } | undefined)?.path ??
      request.originalUrl?.split('?')[0];

    const targetResource = metadata?.targetResourceType
      ? {
          type: metadata.targetResourceType,
          id: this.extractTargetResourceId(
            request,
            metadata.targetResourceType,
          ),
        }
      : undefined;

    const log = this.accessLogService.buildLog({
      serviceName: this.serviceName,
      module: metadata?.module ?? controllerName,
      action: metadata?.action ?? `${method}:${path ?? 'unknown'}`,
      actionDescription:
        metadata?.actionDescription ?? `${method} ${path ?? 'unknown'}`,
      targetResource,
      outcome,
      outcomeDetail,
      statusCode,
      responseTimeMs: Date.now() - startedAt,
      userId: this.extractUserId(request),
      ip: this.extractIp(request),
      requestId: this.extractRequestId(request),
      method,
      path,
    });

    void this.accessLogService.enqueue(log).catch(() => {
      this.logger.warn(
        `Não foi possível enfileirar log de acesso (requestId: ${log.requestId})`,
      );
    });
  }

  private resolveOutcome(
    error: unknown,
    fallbackStatusCode: number,
  ): {
    outcome: AccessLogOutcome;
    outcomeDetail?: string;
    statusCode?: number;
  } {
    if (!error) {
      return {
        outcome: AccessLogOutcome.SUCCESS,
        statusCode: fallbackStatusCode,
      };
    }

    if (error instanceof HttpException) {
      const statusCode = error.getStatus();
      const outcome =
        statusCode >= 500 ? AccessLogOutcome.ERROR : AccessLogOutcome.FAILURE;
      return {
        outcome,
        outcomeDetail: this.extractExceptionDetail(error),
        statusCode,
      };
    }

    return {
      outcome: AccessLogOutcome.ERROR,
      outcomeDetail: (error as Error)?.message ?? 'Erro interno desconhecido',
      statusCode: fallbackStatusCode,
    };
  }

  private extractExceptionDetail(error: HttpException): string {
    const response = error.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (typeof response === 'object' && response !== null) {
      const message = (response as { message?: string | string[] }).message;
      if (Array.isArray(message)) {
        return message.join('; ');
      }
      if (typeof message === 'string') {
        return message;
      }
    }
    return error.message;
  }

  private extractUserId(request: RequestLike): string | undefined {
    const userId =
      request.user?.sub ??
      request.headers['x-user-id'] ??
      request.headers['x-utilizador-id'];
    return userId !== undefined && userId !== null ? String(userId) : undefined;
  }

  private extractIp(request: RequestLike): string | undefined {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip ?? request.socket?.remoteAddress ?? undefined;
  }

  private extractRequestId(request: RequestLike): string {
    const header = request.headers['x-request-id'];
    if (typeof header === 'string' && header.length > 0) {
      return header;
    }
    return randomUUID();
  }

  private extractTargetResourceId(
    request: RequestLike,
    targetResourceType: string,
  ): string {
    const params = request.params;
    const lowerType = targetResourceType.toLowerCase();

    if (params?.id) {
      return params.id;
    }
    const paramField = params?.[`${lowerType}Id`];
    if (paramField) {
      return paramField;
    }

    const body = request.body as
      | { id?: string | number; [key: string]: unknown }
      | undefined;
    const bodyId = body?.id;
    if (bodyId !== undefined && bodyId !== null) {
      return String(bodyId);
    }

    const bodyField = body?.[`${lowerType}Id`];
    if (
      (typeof bodyField === 'string' || typeof bodyField === 'number') &&
      bodyField !== ''
    ) {
      return String(bodyField);
    }

    return 'unknown';
  }
}
