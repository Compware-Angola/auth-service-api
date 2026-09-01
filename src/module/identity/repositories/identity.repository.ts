import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Identity } from '../entities/identity.entity';

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

  findAll(): Promise<Identity[]> {
    return this.repository.find();
  }

  findById(id: number): Promise<Identity | null> {
    return this.repository.findOne({ where: { id } });
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
  findForLogin(identifier: string): Promise<Identity | null> {
    return this.repository
      .createQueryBuilder('identity')
      .leftJoinAndSelect('identity.userPlatforms', 'userPlatform')
      .leftJoinAndSelect('userPlatform.platform', 'platform')
      .addSelect('identity.passwordHash')
      .where('identity.username = :identifier', { identifier })
      .orWhere('identity.email = :identifier', { identifier })
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
