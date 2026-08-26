import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repository: Repository<RefreshToken>,
  ) {}

  create(data: Partial<RefreshToken>): Promise<RefreshToken> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  findByTokenId(tokenId: string): Promise<RefreshToken | null> {
    return this.repository.findOne({ where: { tokenId } });
  }

  async revoke(tokenId: string): Promise<void> {
    await this.repository.update({ tokenId }, { revoked: 1 });
  }

  async revokeAllForIdentity(identityId: number): Promise<void> {
    await this.repository.update({ identityId }, { revoked: 1 });
  }
}
