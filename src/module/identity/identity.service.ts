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

@Injectable()
export class IdentityService {
  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly hashService: HashService,
  ) { }

  async create(dto: CreateIdentityDto): Promise<Identity> {
    const [byUsername, byEmail, byBi] = await Promise.all([
      this.identityRepository.findByUsername(dto.username),
      this.identityRepository.findByEmail(dto.email),
      this.identityRepository.findByBi(dto.bi),
    ]);

    if (byUsername) {
      throw new ConflictException(
        'Já existe uma identidade com este username.',
      );
    }
    if (byEmail) {
      throw new ConflictException('Já existe uma identidade com este email.');
    }
    if (byBi) {
      throw new ConflictException('Já existe uma identidade com este BI.');
    }

    const hashedPassword = await this.hashService.criarHash(dto.password);

    const identity = await this.identityRepository.create({
      username: dto.username,
      email: dto.email,
      name: dto.name,
      bi: dto.bi,
      avatar: dto.avatar ?? 'default-avatar.png',
      passwordHash: hashedPassword,
      status: 1,
    });

    return this.sanitize(identity);
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
      throw new UnauthorizedException('Credenciais inválidas.');
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
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    return identity;
  }

  private sanitize(identity: Identity): Identity {
    const { passwordHash, ...rest } = identity;
    return rest as Identity;
  }
}
