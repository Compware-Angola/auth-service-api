import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Identity } from '../entities/identity.entity';

@Injectable()
export class IdentityRepository {
  constructor(
    @InjectRepository(Identity)
    private readonly repository: Repository<Identity>,
  ) {}

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

  async update(id: number, data: Partial<Identity>): Promise<Identity | null> {
    await this.repository.update({ id }, data);
    return this.findById(id);
  }

  async setStatus(id: number, status: number): Promise<Identity | null> {
    await this.repository.update({ id }, { status });
    return this.findById(id);
  }
}
