import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformRepository } from './repositories/platform.repository';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';
import { Platform } from './entities/platform.entity';

@Injectable()
export class PlatformService {
  constructor(private readonly platformRepository: PlatformRepository) {}

  async create(dto: CreatePlatformDto): Promise<Platform> {
    const existing = await this.platformRepository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException(
        `Já existe uma plataforma com o código "${dto.code}".`,
      );
    }
    return this.platformRepository.create({ ...dto, status: 1 });
  }

  findAll(): Promise<Platform[]> {
    return this.platformRepository.findAll();
  }

  async findById(id: number): Promise<Platform> {
    const platform = await this.platformRepository.findById(id);
    if (!platform) {
      throw new NotFoundException(`Plataforma ${id} não encontrada.`);
    }
    return platform;
  }

  async findByCode(code: string): Promise<Platform> {
    const platform = await this.platformRepository.findByCode(code);
    if (!platform) {
      throw new NotFoundException(`Plataforma "${code}" não encontrada.`);
    }
    return platform;
  }

  async update(id: number, dto: UpdatePlatformDto): Promise<Platform> {
    await this.findById(id);

    if (dto.code) {
      const existing = await this.platformRepository.findByCode(dto.code);
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Já existe uma plataforma com o código "${dto.code}".`,
        );
      }
    }

    const updated = await this.platformRepository.update(id, dto);
    return updated as Platform;
  }

  async remove(id: number): Promise<void> {
    await this.findById(id);
    await this.platformRepository.delete(id);
  }
}
