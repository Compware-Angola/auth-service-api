import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HashService } from 'src/app.service';
import { IdentityRepository } from './repositories/identity.repository';
import { CreateIdentityDto } from './dto/create-identity.dto';
import { UpdateIdentityDto } from './dto/update-identity.dto';
import { Identity } from './entities/identity.entity';
import { PlatformAccessService } from '../platform-access/platform-access.service';
import { CreatePlatformAccessDto } from '../platform-access/dto/create-platform-access.dto';
import { FindAllIdentitiesDto } from './dto/find-all.dto';
interface PlatformAccessResult {
  platformCode: string;
  status: 'granted' | 'failed';
  reason?: string;
}

export interface CreateIdentityResult {
  identity: Identity;
  platformsSummary: PlatformAccessResult[];
}
@Injectable()
export class IdentityService {
  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly hashService: HashService,
    private readonly platformAccessService: PlatformAccessService
  ) { }

  private async generateUniqueUsername(
    firstName: string,
    lastName: string,
  ): Promise<string> {
    const first = firstName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '.');

    const last = lastName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '.');

    const baseUsername = `${first}.${last}`;

    let username = baseUsername;
    let counter = 1;

    while (await this.identityRepository.findByUsername(username)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }

  async create(dto: CreateIdentityDto): Promise<CreateIdentityResult> {
    const { platforms, ...rest } = dto;
    const [byEmail, byBi] = await Promise.all([
      this.identityRepository.findByEmail(rest.email),
      this.identityRepository.findByBi(rest.bi),
    ]);

    if (byEmail) {
      throw new ConflictException('Já existe uma identidade com este email.');
    }

    if (byBi) {
      throw new ConflictException('Já existe uma identidade com este BI.');
    }

    const hashedPassword = await this.hashService.criarHash(dto.password);
    const name = `${dto.firstName.trim()} ${dto.lastName.trim()}`;
    const username = await this.generateUniqueUsername(dto.firstName, dto.lastName);

    const identity = await this.identityRepository.create({
      username,
      email: dto.email,
      name,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone ?? null,
      bi: dto.bi,
      avatar: dto.avatar ?? 'default-avatar.png',
      passwordHash: hashedPassword,
      status: 1,
    });

    const results = await Promise.allSettled(
      platforms.map((platform) =>
        this.platformAccessService.grantAccess({
          platformCode: platform.platformCode,
          userId: identity.id,
          platformUserKey: platform.platformUserKey,
        }),
      ),
    );

    const platformsSummary: PlatformAccessResult[] = results.map((result, i) => {
      const platformCode = platforms[i].platformCode;
      if (result.status === 'fulfilled') {
        return { platformCode, status: 'granted' };
      }
      const reason =
        result.reason instanceof Error
          ? result.reason.message
          : 'Erro desconhecido ao conceder acesso.';
      return { platformCode, status: 'failed', reason };
    });

    return {
      identity: this.sanitize(identity),
      platformsSummary,
    };
  }



  async findAll(query: FindAllIdentitiesDto) {
    return this.identityRepository.findAll(query);
  }

  async findById(id: number) {
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



    if (dto.email) {
      const existing = await this.identityRepository.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'Já existe uma identidade com este email.',
        );
      }
    }

    if (dto.bi) {
      const existing = await this.identityRepository.findByBi(dto.bi);
      if (existing && existing.id !== id) {
        throw new ConflictException('Já existe uma identidade com este BI.');
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

  /**
   * Valida username/email + password. Usado pelo novo fluxo de login
   * (IdentityAuthModule). Retorna a identidade AINDA com a password —
   * quem chamar é responsável por não expor esse campo para fora.
   */
  async validateUserCredentials(
    identifier: string,
    password: string,
  ): Promise<Identity> {
    const identity = await this.identityRepository.findForLogin(identifier);
    if (!identity) {
      throw new UnauthorizedException('Acesso Não Autorizado.');
    }

    if (identity.status !== 1) {
      throw new ForbiddenException(
        'Identidade inativa. Contacte o administrador do sistema.',
      );
    }

    const matches = await this.hashService.verificarHash(
      password,
      identity.passwordHash,
    );
    if (!matches) {
      throw new UnauthorizedException('Acesso Não Autorizado.');
    }

    return identity;
  }

  private sanitize(identity: Identity): Identity {
    const { passwordHash, ...rest } = identity;
    return rest as Identity;
  }
}
