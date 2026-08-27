import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPlatform } from '../entities/user-platform.entity';

@Injectable()
export class UserPlatformRepository {
  constructor(
    @InjectRepository(UserPlatform)
    private readonly repository: Repository<UserPlatform>,
  ) {}

  create(data: Partial<UserPlatform>): Promise<UserPlatform> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  findById(id: number): Promise<UserPlatform | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByUserAndPlatform(
    userId: number,
    platformId: number,
  ): Promise<UserPlatform | null> {
    return this.repository.findOne({ where: { userId, platformId } });
  }

  findByUser(userId: number): Promise<UserPlatform[]> {
    return this.repository.find({ where: { userId } });
  }

  findByPlatform(platformId: number): Promise<UserPlatform[]> {
    return this.repository.find({ where: { platformId } });
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete({ id });
  }
}
