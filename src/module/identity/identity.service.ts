import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IdentityRepository } from './repositories/identity.repository';
import { CreateIdentityDto } from './dto/create-identity.dto';
import { UpdateIdentityDto } from './dto/update-identity.dto';
import { Identity } from './entities/identity.entity';

@Injectable()
export class IdentityService {
  constructor(private readonly identityRepository: IdentityRepository) {}

  async create(dto: CreateIdentityDto): Promise<Identity> {
    const [byUsername, byEmail] = await Promise.all([
      this.identityRepository.findByUsername(dto.username),
      this.identityRepository.findByEmail(dto.email),
    ]);

    if (byUsername) {
      throw new ConflictException(
        'Já existe uma identidade com este username.',
      );
    }
    if (byEmail) {
      throw new ConflictException('Já existe uma identidade com este email.');
    }

    return this.identityRepository.create({
      username: dto.username,
      email: dto.email,
      name: dto.name,
      status: 1,
    });
  }

  findAll(): Promise<Identity[]> {
    return this.identityRepository.findAll();
  }

  async findById(id: number): Promise<Identity> {
    const identity = await this.identityRepository.findById(id);
    if (!identity) {
      throw new NotFoundException(`Identidade ${id} não encontrada.`);
    }
    return identity;
  }

  async findByUsername(username: string): Promise<Identity> {
    const identity = await this.identityRepository.findByUsername(username);
    if (!identity) {
      throw new NotFoundException(
        `Identidade com username "${username}" não encontrada.`,
      );
    }
    return identity;
  }

  async findByEmail(email: string): Promise<Identity> {
    const identity = await this.identityRepository.findByEmail(email);
    if (!identity) {
      throw new NotFoundException(
        `Identidade com email "${email}" não encontrada.`,
      );
    }
    return identity;
  }

  async exists(id: number): Promise<boolean> {
    const identity = await this.identityRepository.findById(id);
    return !!identity;
  }

  async update(id: number, dto: UpdateIdentityDto): Promise<Identity> {
    await this.findById(id);

    if (dto.username) {
      const existing = await this.identityRepository.findByUsername(
        dto.username,
      );
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'Já existe uma identidade com este username.',
        );
      }
    }

    if (dto.email) {
      const existing = await this.identityRepository.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'Já existe uma identidade com este email.',
        );
      }
    }

    const updated = await this.identityRepository.update(id, dto);
    return updated as Identity;
  }

  async setActive(id: number, active: boolean): Promise<Identity> {
    await this.findById(id);
    const updated = await this.identityRepository.setStatus(
      id,
      active ? 1 : 0,
    );
    return updated as Identity;
  }
}
