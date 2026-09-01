import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Platform } from '../entities/platform.entity';
import { FindAllPlatformsDto } from '../dto/find-all.dto';

@Injectable()
export class PlatformRepository {
  constructor(
    @InjectRepository(Platform)
    private readonly repository: Repository<Platform>,
  ) { }

  create(data: Partial<Platform>): Promise<Platform> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async findAll(queryDto: FindAllPlatformsDto) {
    const { status, page = 1, limit = 10, search } = queryDto;
    const qb = this.repository.createQueryBuilder('platform');

    // Adiciona WHERE conditions baseado nos parâmetros da query
    if (search) {
      qb.andWhere('platform.code ILIKE :search', { search: `%${search}%` })
        .orWhere('platform.name ILIKE :search', { search: `%${search}%` });
    }
    if (status !== undefined && status !== null) {
      qb.andWhere('platform.status = :status', { status });
    }

    // Aplica paginação
    qb.skip((page - 1) * limit);
    qb.take(limit);
    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
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
