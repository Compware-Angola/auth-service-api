import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Identity } from '../entities/identity.entity';
import { FindAllIdentitiesDto } from '../dto/find-all.dto';

@Injectable()
export class IdentityRepository {
  constructor(
    @InjectRepository(Identity)
    private readonly repository: Repository<Identity>,
  ) { }

  create(data: Partial<Identity>): Promise<Identity> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async findAll(query: FindAllIdentitiesDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      platformCode,
    } = query;
    const queryBuilder = this.repository.createQueryBuilder('identity')
      .leftJoinAndSelect('identity.userPlatforms', 'userPlatform')
      .leftJoinAndSelect('userPlatform.platform', 'platform');

    if (search) {
      queryBuilder.andWhere('identity.name ILIKE :name', { name: `%${search}%` })
        .orWhere('identity.email ILIKE :email', { email: `%${search}%` })
        .orWhere('identity.phone ILIKE :phone', { phone: `%${search}%` })
        .orWhere('identity.bi ILIKE :bi', { bi: `%${search}%` });
    }
    if (status) {
      queryBuilder.andWhere('identity.status = :status', { status });
    }
    if (platformCode) {
      queryBuilder.andWhere('platform.code = :platformCode', { platformCode });
    }


    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);
    const [data, total] = await queryBuilder.getManyAndCount();
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

  findById(id: number): Promise<Identity | null> {


    return this.repository
      .createQueryBuilder('identity')
      .leftJoinAndSelect('identity.userPlatforms', 'userPlatform')
      .leftJoinAndSelect('userPlatform.platform', 'platform')

      .where('identity.id = :id', { id })
      .getOne();
  }

  findByUsername(username: string): Promise<Identity | null> {
    return this.repository.findOne({ where: { username } });
  }

  findByEmail(email: string): Promise<Identity | null> {
    return this.repository.findOne({ where: { email } });
  }

  findByBi(bi: string): Promise<Identity | null> {
    return this.repository.findOne({ where: { bi } });
  }

  /**
   * Único ponto que lê a PASSWORD (select:false na entidade). Usado
   * exclusivamente pelo fluxo de login para validar credenciais.
   */
  findForLogin(identifier: string, platformCode: string): Promise<Identity | null> {
    return this.repository
      .createQueryBuilder('identity')
      .leftJoinAndSelect('identity.userPlatforms', 'userPlatform')
      .leftJoinAndSelect('userPlatform.platform', 'platform')
      .addSelect('identity.passwordHash')
      .where('identity.username = :identifier', { identifier })
      .orWhere('identity.email = :identifier', { identifier })
      .andWhere('platform.code = :platformCode', { platformCode })
      .getOne();
  }

  async update(id: number, data: Partial<Identity>): Promise<Identity | null> {
    await this.repository.update({ id }, data);
    return this.findById(id);
  }

  async setStatus(id: number, status: number): Promise<Identity | null> {
    await this.repository.update({ id }, { status });
    return this.findById(id);
  }
}
