// src/guards/active-user.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';
import { UserSignInService } from '../auth/users.signIn.service';

@Injectable()
export class ActiveUserGuard implements CanActivate {
  constructor(private readonly usersService: UserSignInService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: any = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user || !user.sub) {
      throw new UnauthorizedException(
        'Usuário não autenticado ou token inválido.',
      );
    }

    if (user.platform === 'PEOPLE_MANAGEMENT') {
      const isPeopleActive =
        await this.usersService.isUserActivePeopleManagement(user.sub);
      if (!isPeopleActive) {
        throw new UnauthorizedException(
          'O seu acesso foi revogado ou usuário inativo (Gestão de Pessoas).',
        );
      }
      return true;
    }

    const userDb = await this.usersService.statusLogged(user.sub);

    if (!userDb) {
      throw new UnauthorizedException(
        'O seu acesso foi revogado ou usuário inativo.',
      );
    }

    return true;
  }
}
