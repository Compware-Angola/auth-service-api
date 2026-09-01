import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformRepository } from './repositories/platform.repository';
import { UserPlatformRepository } from './repositories/user-platform.repository';
import { CreatePlatformAccessDto } from './dto/create-platform-access.dto';
import { UserPlatform } from './entities/user-platform.entity';

@Injectable()
export class PlatformAccessService {
  constructor(
    private readonly platformRepository: PlatformRepository,
    private readonly userPlatformRepository: UserPlatformRepository,
  ) { }

  async grantAccess(dto: CreatePlatformAccessDto): Promise<UserPlatform> {
    const platform = await this.platformRepository.findByCode(
      dto.platformCode,
    );
    if (!platform) {
      throw new NotFoundException(
        `Plataforma "${dto.platformCode}" não encontrada.`,
      );
    }

    const existing = await this.userPlatformRepository.findByUserAndPlatform(
      dto.userId,
      platform.id,
    );
    if (existing) {
      throw new ConflictException(
        'O utilizador já tem acesso a esta plataforma.',
      );
    }

    return this.userPlatformRepository.create({
      userId: dto.userId,
      platformId: platform.id,
      platformUserKey: dto.platformUserKey,
      status: 1,
    });
  }

  async revokeAccess(id: number): Promise<void> {
    const access = await this.userPlatformRepository.findById(id);
    if (!access) {
      throw new NotFoundException(`Acesso ${id} não encontrado.`);
    }
    await this.userPlatformRepository.delete(id);
  }

  findByUser(userId: number): Promise<UserPlatform[]> {
    return this.userPlatformRepository.findByUser(userId);
  }

  findByPlatform(platformId: number): Promise<UserPlatform[]> {
    return this.userPlatformRepository.findByPlatform(platformId);
  }

  async hasAccess(userId: number, platformCode: string): Promise<boolean> {
    const platform = await this.platformRepository.findByCode(platformCode);
    if (!platform) {
      return false;
    }

    const access = await this.userPlatformRepository.findByUserAndPlatform(
      userId,
      platform.id,
    );
    return !!access && access.status === 1;
  }
}
