import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Platform } from '../entities/platform.entity';

@Injectable()
export class PlatformRepository {
  constructor(
    @InjectRepository(Platform)
    private readonly repository: Repository<Platform>,
  ) {}

  create(data: Partial<Platform>): Promise<Platform> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  findAll(): Promise<Platform[]> {
    return this.repository.find();
  }

  findById(id: number): Promise<Platform | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByCode(code: string): Promise<Platform | null> {
    return this.repository.findOne({ where: { code } });
  }

  async update(id: number, data: Partial<Platform>): Promise<Platform | null> {
    await this.repository.update({ id }, data);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete({ id });
  }
}
