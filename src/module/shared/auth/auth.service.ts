import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { DataSource } from 'typeorm';
import {
  AuthPlatform,
  LogoutDto,
  MakloggedOutDto,
  SignInDto,
} from './dto/signIn.dto';
import { signUpDto } from './dto/signUp.dto';
import { HashService } from 'src/app.service';
import { JwtService } from '@nestjs/jwt';
import { toLowerCaseKeys } from 'src/util/toLowerCaseKeys';
import { CheckEmailExistsDto } from './dto/check-email-exists';
import { MailerService } from '@nestjs-modules/mailer';
import { ResetPasswordDto } from './dto/reset-password';
import { SendRenewDataDto } from './dto/send-renew-data.dto';
import { GetCurrentPlataformDto } from './dto/get-plataform-user';
import { JwtPayload } from './types/jwt-payload.interface';
import { UserSignInService } from './users.signIn.service';
import { UserRole, UserRoles } from './types/ roles.enum';
import { UserUpdatePasswordDto } from './dto/user-update-password';
import { AnoLectivoUtil } from 'src/util/current-academic-year';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AuthService {
  @InjectQueue('operator_box')
  private readonly operator_boxQueue: Queue;
  constructor(
    private readonly dataSource: DataSource,
    private hashService: HashService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly userSignInService: UserSignInService,
    private readonly anoLectivoUtil: AnoLectivoUtil,
  ) { }
  async signIn(signInDto: SignInDto, ip: string) {
    const { username, password, platform } = signInDto;

    let user: any;
    let roles: any = null;
    let groups: any;
    let permissions: any = null;

    switch (platform) {
      /* ===================== GA ===================== */
      case AuthPlatform.GA:
        user = await this.findUserByusernameGA(username);
        if (user?.active_state !== 1) {
          throw new ForbiddenException(
            'A sua conta está inativa. Contacte o administrador do sistema.',
          );
        }
        groups = await this.findGroupsByUserGA(username);

        if (!user) break;

        roles = await this.checkUserRoles(username);
        permissions = await this.getUserPermissionsByUsernameGA(username);

        break;

      /* ===================== PORTAL ===================== */
      case AuthPlatform.PORTAL:
        user = await this.findUserByUsernameEmailOrDocumentoPORTAL(username);

        if (!user) break;

        break;

      case AuthPlatform.PEOPLE_MANAGEMENT:
        user = await this.findUserByEmailPeopleManagement(username);

        if (!user) break;

        break;

      default:
        throw new BadRequestException(
          'Plataforma inválida. Use GA, PORTAL ou PEOPLE_MANAGEMENT.',
        );
    }

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    /* 🔐 Validação de estado */
    if (platform === AuthPlatform.GA && user.active_state !== 1) {
      throw new BadRequestException(
        'Usuário inativo, contate o administrador do sistema.',
      );
    }

    if (platform === AuthPlatform.PEOPLE_MANAGEMENT && user.estado !== 1) {
      throw new BadRequestException(
        'Usuário inativo, contate o administrador do sistema.',
      );
    }

    if (platform === AuthPlatform.PEOPLE_MANAGEMENT && user.precisa_mudar_senha === 1) {
      throw new ForbiddenException(
        'Atualize sua senha para ter acesso ao sistema',
      );
    }

    /* 🔑 Validação da senha */
    const verificarHash = await this.hashService.verificarHash(
      password,
      user.password,
    );

    if (!verificarHash) {
      throw new BadRequestException('Credenciais inválidas');
    }
    if (platform === AuthPlatform.GA) {
      await this.userSignInService.registrarOuAtualizarAcesso(
        user.pk_utilizador,
        ip,
        true,
      );
    }
    /* 🎫 Payload por plataforma */
    let payload: any;
    if (platform === AuthPlatform.PORTAL) {
      payload = {
        username: user.username,
        sub: user.id,
        email: user.email,
        codigoPreinscricao: user.codigo_preinscricao,
        platform,
      };
    } else if (platform === AuthPlatform.PEOPLE_MANAGEMENT) {
      permissions = await this.getUserPermissionsPeopleManagement(user.codigo);
      payload = {
        username: user.email,
        nome: user.nome,
        sub: user.codigo,
        email: user.email,
        permissions,
        platform,
      };
    } else {
      payload = {
        username: user.username,
        nome: user.nome,
        sub: user.pk_utilizador,
        permissions,
        roles,
        platform,
      };
    }

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      expires_in: 21600,
      platform,
      user: { ...user, password: undefined },
      ...((platform === AuthPlatform.GA ||
        platform === AuthPlatform.PEOPLE_MANAGEMENT) && {
        roles,
        groups,
        permissions,
      }),
      mensagem:
        'Login realizado com sucesso. Utilize o token JWT nas próximas chamadas.',
    };
  }
  async UserupdatePassword(
    dto: UserUpdatePasswordDto,
    usuarioLogadoId: number,
  ): Promise<{ message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //
      if (dto.novaSenha !== dto.confirmarNovaSenha) {
        throw new BadRequestException(
          'A nova senha e a confirmação não coincidem',
        );
      }

      if (dto.senhaAtual === dto.novaSenha) {
        throw new BadRequestException(
          'A nova senha não pode ser igual à senha antiga',
        );
      }
      // Verifica se o utilizador existe
      const [user] = await queryRunner.manager.query(
        `SELECT PASSWORD FROM FK2_MCA_TB_UTILIZADOR WHERE PK_UTILIZADOR = ${usuarioLogadoId} AND ROWNUM = 1`,
      );

      if (!user) {
        throw new NotFoundException('Utilizador não encontrado');
      }
      const verificarHash = await this.hashService.verificarHash(
        dto.senhaAtual,
        user.PASSWORD,
      );
      if (!verificarHash) {
        throw new BadRequestException('A senha atual está incorreta');
      }

      // Opção 1: bcrypt local
      const hashedPassword: string = await this.hashService.criarHash(
        dto.novaSenha,
      );

      await queryRunner.manager.query(`
      UPDATE FK2_MCA_TB_UTILIZADOR
      SET
        PASSWORD = '${hashedPassword}',
        LAST_PASSWORD_CHANGE = SYSDATE,

        UPDATED_AT = SYSDATE
      WHERE PK_UTILIZADOR = ${usuarioLogadoId}
    `);

      await queryRunner.commitTransaction();

      return { message: 'Senha atualizada com sucesso' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async logout(logoutDto: LogoutDto, utilizadorId: number) {
    const { platform } = logoutDto;
    switch (platform) {
      case AuthPlatform.GA:
        await this.userSignInService.makloggedOut(utilizadorId);
        await this.queueOperatorBox(utilizadorId);

        break;

      case AuthPlatform.PORTAL:
        console.log('Autenticação pela plataforma PORTAL');
        break;

      default:
        throw new BadRequestException('Plataforma inválida. Use GA ou PORTAL.');
    }

    return {
      message: 'Logout efetuado com sucesso',
    };
  }

  async signUp(signUpDto: signUpDto) {
    // Implement sign-up logic here
  }

  async getCurrentUser(
    userPayload: JwtPayload,
    codigoPreinscricao?: number,
    ignorarPreinscricao: boolean = false,
  ): Promise<any> {

    let user: any;
    let groups: any;
    let roles: any = null;
    let isAuthenticated = true;
    let permissions: any = null;
    if (!userPayload.platform) {
      throw new BadRequestException('Plataforma não especificada.');
    }

    switch (userPayload.platform) {
      /* ===================== GA ===================== */
      case AuthPlatform.GA:

        user = await this.findUserByusernameGA(userPayload.username);
        roles = await this.checkUserRoles(userPayload.username);
        groups = await this.findGroupsByUserGA(userPayload.username);
        permissions = await this.getUserPermissionsByUsernameGA(
          userPayload.username,
        );

        if (!user) break;

        if (user.active_state !== 1) {
          throw new UnauthorizedException('Usuário inativo na plataforma GA');
        }

        isAuthenticated = await this.userSignInService.statusLogged(
          user.pk_utilizador,
        );

        if (!isAuthenticated) {
          throw new UnauthorizedException(
            'Por motivos de segurança, o seu acesso foi temporariamente suspenso. É necessário autenticar-se novamente.',
          );
        }
        break;

      /* ===================== PORTAL ===================== */
      case AuthPlatform.PORTAL:
        //TODO:METER PARA TRAZER POR SEMESTRE
        //  const semestre = await this.anoLectivoUtil.getSemestreAtual();
        //  const semestreAtual = semestre.semestre ?? 1;
        user = await this.getPortalUserData(
          userPayload.sub,
          codigoPreinscricao,
          ignorarPreinscricao,
        );
        isAuthenticated = true;
        break;

      case AuthPlatform.PEOPLE_MANAGEMENT:
        //TODO:METER PARA TRAZER POR SEMESTRE
        //  const semestre = await this.anoLectivoUtil.getSemestreAtual();
        //  const semestreAtual = semestre.semestre ?? 1;
        user = await this.findUserByEmailPeopleManagement(userPayload.username);
        isAuthenticated = true;
        break;

      default:
        throw new BadRequestException('Plataforma inválida. Use GA ou PORTAL.');
    }

    if (!user) {
      throw new NotFoundException(
        'Usuário não encontrado na plataforma informada',
      );
    }

    return {
      isAuthenticated,
      user: user ? { ...user, password: undefined } : null,
      ...(userPayload.platform === AuthPlatform.GA && {
        roles,
        groups,
        permissions,
      }),
      message: 'Current user fetched successfully.',
    };
  }

  async checkEmailExists(chechEmailExists: CheckEmailExistsDto): Promise<any> {
    const { email, platform } = chechEmailExists;
    switch (platform) {
      case AuthPlatform.GA:
        const existsGA = await this.checkEmailExistsGA(email);
        if (!existsGA) {
          return { email, exists: false };
        }
        return { email, exists: existsGA };

      case AuthPlatform.PORTAL:
        const existsPortal = await this.checkEmailExistsPortal(email);
        if (!existsPortal) {
          return { email, exists: false };
        }
        return { email, exists: true };

      case AuthPlatform.PEOPLE_MANAGEMENT_PORTAL:
        const existsPeopleManagementPortal = await this.checkEmailExistsPeopleManagementPortal(email);
        if (!existsPeopleManagementPortal) {
          return { email, exists: false };
        }
        return { email, exists: true };

      default:
        throw new BadRequestException('Plataforma inválida. Use GA ou PORTAL.');
    }
  }
  async makloggedOut(
    makloggedOutDto: MakloggedOutDto,
    codigoutilizador: number,
  ) {
    await this.userSignInService.makloggedOut(codigoutilizador);

    return {
      message: 'Logout efetuado com sucesso',
    };
  }
  async SendchangePassword(dto: CheckEmailExistsDto) {
    const { email, matricula, platform } = dto;

    // Validação inicial da plataforma
    if (![AuthPlatform.GA, AuthPlatform.PORTAL, AuthPlatform.PEOPLE_MANAGEMENT_PORTAL].includes(platform)) {
      throw new BadRequestException('Plataforma inválida. Use GA ou PORTAL.');
    }

    let user: any; // Ajuste o tipo conforme tua entity (UserGA | UserPortal | etc)
    let resetUrlBase: string;
    let userId: number;

    switch (platform) {
      case AuthPlatform.GA:
        if (!email) {
          throw new BadRequestException('Email é obrigatório.');
        }
        user = await this.checkEmailExistsGA(email);

        if (!user) {
          throw new BadRequestException('Email não encontrado.');
        }

        resetUrlBase = process.env.URL_GA || 'http://localhost:3000';
        userId = user?.pk_utilizador;
        break;

      case AuthPlatform.PORTAL:
        if (!email) {
          throw new BadRequestException('Email é obrigatório.');
        }
        if (!matricula) {
          throw new BadRequestException('Matrícula é obrigatória.');
        }
        user = await this.checkEmailExistsPortal(email, matricula);
        console.log(user, 'user');

        if (!user) {
          throw new BadRequestException('Email ou matrícula não encontrados.');
        }

        resetUrlBase = process.env.URL_PORTAL || 'http://localhost:3001';
        userId = user.id;
        break;
      case AuthPlatform.PEOPLE_MANAGEMENT_PORTAL:
        if (!email) {
          throw new BadRequestException('Email é obrigatório.');
        }
        user = await this.checkEmailExistsPeopleManagementPortal(email);
        console.log(user, 'user');

        if (!user) {
          throw new BadRequestException('Email não encontrados.');
        }
        resetUrlBase = process.env.URL_PEOPLE_MANAGEMENT_PORTAL || 'http://localhost:3001';
        userId = user.id;
        console.log({ resetUrlBase, userId })
        break;
      default:
        // Nunca chega aqui por causa da validação inicial
        throw new BadRequestException('Plataforma não suportada.');
    }

    // Verificação comum às duas plataformas
    if (!user) {
      throw new BadRequestException('Email não encontrado.');
    }

    // Payload comum (ajuste campos conforme necessário)
    const payload = {
      sub: userId,
      email: user.email,
      platform, // opcional: ajuda no backend a saber de onde veio
    };

    // Token com expiração curta
    const resetToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    // Construção do link
    const resetPath = this.resetPath(platform)

    const resetLink = `${resetUrlBase}${resetPath}/${resetToken}`;

    console.log(`[Reset Link - ${platform}]`, resetLink); // para debug

    // Envio de email (podes parametrizar o assunto e template por plataforma se quiseres)
    const subject = this.subject(platform);

    const html = `
    <p>Olá,</p>
    <p>Recebemos um pedido para ${platform === AuthPlatform.GA ? 'configurar' : 'redefinir'} a sua senha.</p>
    <p>Clique no link abaixo para prosseguir (válido por 15 minutos):</p>
    <p><a href="${resetLink}">${resetLink}</a></p>
    <p>Se não solicitou esta ação, ignore este email.</p>
    <p>Atenciosamente,<br>Equipa do Sistema Académico</p>
  `;
    //TODO:CHAMAR O SERVIÇO DE EMAIL !
    await this.sendEmail(email, subject, html);

    return {
      message: `Email de ${platform === AuthPlatform.GA ? 'configuração' : 'redefinição'} de senha enviado com sucesso.`,
    };
  }
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { token, newPassword, platform } = resetPasswordDto;

    // 1. Validar plataforma logo no início
    if (![AuthPlatform.GA, AuthPlatform.PORTAL, AuthPlatform.PEOPLE_MANAGEMENT_PORTAL, AuthPlatform.PEOPLE_MANAGEMENT].includes(platform)) {
      throw new BadRequestException('Plataforma inválida. Use GA ou PORTAL.');
    }

    // 2. Verificar e decodificar o token JWT
    let payload: {
      sub: number | string;
      email: string;
      platform?: AuthPlatform;
    };
    try {
      payload = this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    // 3. Verificar se o token é da plataforma correta (segurança extra)
    if (payload.platform && payload.platform !== platform) {
      throw new BadRequestException(
        'Token não corresponde à plataforma informada.',
      );
    }

    let userId: any;
    let message = '';

    switch (platform) {
      case AuthPlatform.GA: {
        // Para GA, o sub já é o ID do utilizador
        userId = payload.sub;

        // Verifica se o utilizador existe (opcional, mas recomendado)
        const user = await this.findUserByIdGA(userId);
        if (!user) {
          throw new NotFoundException('Utilizador não encontrado no GA.');
        }
        if (await this.hashService.verificarHash(newPassword, user.password)) {
          throw new BadRequestException(
            'A nova senha não pode ser igual à senha atual. Escolha uma senha diferente.',
          );
        }
        const hashedPassword = await this.hashService.criarHash(newPassword);
        // Atualiza a senha (já faz hash de   ntro do método, presumo)
        await this.updatePasswordGA(userId, hashedPassword);

        message =
          'Senha configurada com sucesso no GA. Pode agora fazer login.';
        break;
      }

      case AuthPlatform.PORTAL: {
        const user = await this.findUserByIdPortal(payload.sub as number);
        if (!user) {
          throw new NotFoundException('Utilizador não encontrado no Portal.');
        }

        userId = user.id;

        // Hash da senha (obrigatório aqui)
        const hashedPassword = await this.hashService.criarHash(newPassword);

        // Atualiza
        await this.updatePasswordPortal(userId, hashedPassword);

        message = 'Senha redefinida com sucesso no Portal.';
        break;
      }

      case AuthPlatform.PEOPLE_MANAGEMENT: {
        const user = await this.findUserByEmailPeopleManagement(payload.email);
        if (!user) {
          throw new NotFoundException(
            'Utilizador não encontrado no People Management.',
          );
        }
        userId = user.codigo;
        const hashedPassword = await this.hashService.criarHash(newPassword);

        await this.updatePasswordPeopleManagement(userId, hashedPassword);

        message = 'Senha redefinida com sucesso no People Management.';
        break;
      }
      case AuthPlatform.PEOPLE_MANAGEMENT_PORTAL: {
        const user = await this.checkEmailExistsPeopleManagementPortal(payload.email);
        if (!user) {
          throw new NotFoundException(
            'Utilizador não encontrado no People Management.',
          );
        }
        userId = user.id;
        const hashedPassword = await this.hashService.criarHash(newPassword);

        await this.updatePasswordPeopleManagementPortal(userId, hashedPassword);

        message = 'Senha redefinida com sucesso no People Management.';
        break;
      }
    }

    return { message };
  }

  async findUserByusernameGA(username: string): Promise<any> {
    const result = await this.dataSource.query(
      `SELECT
    u.CODIGO_IMPORTADO,
    u.NOME,
    u.USERNAME,
    u.PASSWORD,
    u.CODIGO,
    u.EMAIL,
    u.OBS,
    u.USER_PERTENCE,
    u.CREATED_BY,
    u.LAST_UPDATED_BY,
    u.CREATED_AT,
    u.UPDATED_AT,
    u.LAST_PASSWORD_CHANGE,
    u.ACTIVE_STATE,

    u.FOTONAME,
    u.PRIMEIRO_LOG,


    u.NUMEROMAXIMOTENTATIVAS,
    u.PK_UTILIZADOR
FROM FK2_MCA_TB_UTILIZADOR u
WHERE u.USERNAME= :username`,
      [username],
    );

    return await toLowerCaseKeys(result[0]);
  }

  async findUserByIdGA(codigo: number): Promise<any> {
    const result = await this.dataSource.query(
      `SELECT
    u.CODIGO_IMPORTADO,
    u.NOME,
    u.USERNAME,
    u.PASSWORD,
    u.CODIGO,
    u.EMAIL,
    u.OBS,
    u.USER_PERTENCE,
    u.CREATED_BY,
    u.LAST_UPDATED_BY,
    u.CREATED_AT,
    u.UPDATED_AT,
    u.LAST_PASSWORD_CHANGE,
    u.ACTIVE_STATE,

    u.FOTONAME,
    u.PRIMEIRO_LOG,


    u.NUMEROMAXIMOTENTATIVAS,
    u.PK_UTILIZADOR
FROM FK2_MCA_TB_UTILIZADOR u
WHERE u.PK_UTILIZADOR= :codigo`,
      [codigo],
    );

    return await toLowerCaseKeys(result[0]);
  }
  async findUserByIdPortal(codigo: number): Promise<any> {
    const result = await this.dataSource.query(
      `SELECT

    u.EMAIL,

    u.id
    FROM FK2_USERS u
    WHERE u.id = :codigo`,
      [codigo],
    );

    return await toLowerCaseKeys(result[0]);
  }
  async findUserByUsernameEmailOrDocumentoPORTAL(value: string): Promise<any> {
    const result = await this.dataSource.query(
      `
    SELECT
      u.NAME,
     u.TELEFONE,
      u.EMAIL,
      u.TIPO_DE_DOCUMENTO,
      u.NUMERO_DOCUMENTO,
      u.EMAIL_VERIFIED_AT,
      u.PASSWORD,
     u.REMEMBER_TOKEN,
      u.CREATED_AT,
      u.UPDATED_AT,
      u.CANAL,
      u.USERNAME,
      u.GRAUACADEMICO,
      u.FACULDADE,
     u. ESTADO,
     u. FOTO,
    u. MOTIVO_BLOQUEIO,
      u.STATUS_,
      u.ANO_LECTIVO_ID,
      u.ID,
      p.CODIGO AS codigoPreinscricao,
      p.NOME_COMPLETO AS nomeCompleto,
      u.PASSWORD_RESET_REQUIRED
    FROM FK2_USERS u
    LEFT JOIN FK2_TB_PREINSCRICAO p ON u.ID = p.USER_ID
    WHERE
      u.USERNAME = :value
      OR u.EMAIL = :value
      OR u.NUMERO_DOCUMENTO = :value
      OR p.BILHETE_IDENTIDADE = :value
    `,
      [value, value, value, value],
    );

    return result.length ? toLowerCaseKeys(result[0]) : null;
  }

  async findUserByEmailPeopleManagement(email: string): Promise<any> {
    const result = await this.dataSource.query(
      `SELECT
        CODIGO,
        NOME,
        BI,
        NIF,
        TELEFONE,
        TELEFONE_ALTERNATIVO,
        PROVINCIA,
        MUNICIPIO,
        MORADA,
        EMAIL,
        SENHA AS PASSWORD,
        PRECISA_MUDAR_SENHA,
        ESTADO,
        CRIADO_EM
      FROM GP_USUARIOS
      WHERE EMAIL = :email`,
      [email],
    );

    return result.length ? toLowerCaseKeys(result[0]) : null;
  }

  async getUserPermissionsPeopleManagement(
    codigoUsuario: number,
  ): Promise<any[]> {
    const result = await this.dataSource.query(
      `WITH PERMISSOES_ORIGEM AS (
    SELECT
        up.CODIGO_PERMISSAO,
        up.ESTADO,
        1 AS PRIORIDADE
    FROM GP_USUARIOS_PERMISSOES up
    WHERE up.CODIGO_USUARIO = :CODIGO_USUARIO

    UNION ALL

    SELECT
        gp.CODIGO_PERMISSAO,
        1 AS ESTADO,
        2 AS PRIORIDADE
    FROM GP_GRUPOS_USUARIOS gu
    JOIN GP_GRUPOS g
        ON g.CODIGO = gu.CODIGO_GRUPO
       AND g.ESTADO = 1
    JOIN GP_GRUPOS_PERMISSOES gp
        ON gp.CODIGO_GRUPO = gu.CODIGO_GRUPO
       AND gp.ESTADO = 1
    WHERE gu.CODIGO_USUARIO = :CODIGO_USUARIO
      AND gu.ESTADO = 1
),
PERMISSOES_PRIORIZADAS AS (
    SELECT
        CODIGO_PERMISSAO,
        ESTADO,
        ROW_NUMBER() OVER (
            PARTITION BY CODIGO_PERMISSAO
            ORDER BY PRIORIDADE
        ) AS RN
    FROM PERMISSOES_ORIGEM
)
SELECT
    p.CODIGO,
    p.DESCRICAO
FROM PERMISSOES_PRIORIZADAS pp
JOIN GP_PERMISSOES p
    ON p.CODIGO = pp.CODIGO_PERMISSAO
   AND p.ESTADO = 1
WHERE pp.RN = 1
  AND pp.ESTADO = 1
ORDER BY p.DESCRICAO`,
      [codigoUsuario, codigoUsuario],
    );

    return result.map((row: any) => row.DESCRICAO);
  }
  private normalizeRole(value: string): string {
    return value
      ?.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[()]/g, '')
      .replace(/[-]/g, ' ')
      .replace(/\s+/g, '_')
      .toLowerCase()
      .trim();
  }
  async checkUserRoles(username: string): Promise<UserRoles> {
    const roles: UserRoles = {
      [UserRole.DOCENTE]: false,

      [UserRole.REITOR]: false,
      [UserRole.FACULDADES]: false,
      [UserRole.VICE_REITOR]: false,
      [UserRole.ACESSOR_DO_REITOR]: false,
      [UserRole.RESPONSAVEL_DO_GABINETE_DE_QUALIDADE_E_SERVICOS_PEDAGOGICOS]: false,
      [UserRole.DIRECTOR]: false,
      [UserRole.COORDENADOR]: false,
      [UserRole.DECANO]: false,
    };

    // =========================
    // DOCENTE
    // =========================

    const docenteResult = await this.dataSource.query(
      `
      SELECT td.CODIGO
      FROM FK2_MGD_TB_DOCENTE td
      INNER JOIN FK2_MCA_TB_UTILIZADOR tu
        ON json_value(td.CODIGO_UTILIZADOR, '$.pk') = tu.PK_UTILIZADOR
      WHERE tu.USERNAME = :1
    `,
      [username],
    );

    if (docenteResult.length > 0) {
      roles[UserRole.DOCENTE] = true;
    }

    // =========================
    // CARGOS ADMINISTRATIVOS
    // =========================

    const cargosResult = await this.dataSource.query(
      `
      SELECT
        TC.DESCRICAO AS TIPO_CARGO_DESCRICAO
      FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS C
      INNER JOIN FK2_TB_TIPO_CARGO_ADMINISTRATIVO TC
        ON C.FK_TIPO_CARGO = TC.PK_TIPO_CARGO
      INNER JOIN FK2_MCA_TB_UTILIZADOR TU
        ON C.FK_UTILIZADOR = TU.PK_UTILIZADOR
      WHERE TU.USERNAME = :1
      AND C.ACTIVE = 1
    `,
      [username],
    );

    // =========================
    // MAPEAMENTO DOS ROLES
    // =========================

    const roleMap: Record<string, UserRole> = {
      reitor: UserRole.REITOR,
      faculdades: UserRole.FACULDADES,
      vice_reitor: UserRole.VICE_REITOR,
      acessor_a_do_reitor: UserRole.ACESSOR_DO_REITOR,
      responsavel_do_gabinete_de_qualidade_e_servicos_pedagogicos:
        UserRole.RESPONSAVEL_DO_GABINETE_DE_QUALIDADE_E_SERVICOS_PEDAGOGICOS,
      director: UserRole.DIRECTOR,
      coordenador: UserRole.COORDENADOR,
      decano: UserRole.DECANO,
    };

    for (const cargo of cargosResult) {
      const descricaoNormalizada = this.normalizeRole(
        cargo.TIPO_CARGO_DESCRICAO,
      );

      const mappedRole = roleMap[descricaoNormalizada];

      if (mappedRole) {
        roles[mappedRole] = true;
      }
    }

    return roles;
  }
  async findGroupsByUserGA(username: string): Promise<any[]> {
    const result = await this.dataSource.query(
      `SELECT
    g.PK_GRUPO AS codigo,
    g.DESIGNACAO AS designation,
    g.SIGLA AS sigla,
    g.FK_TIPO_DE_GRUPO AS type_group ,
    tg.DESIGNACAO AS type_group_designation
FROM FK2_MCA_TB_GRUPO_UTILIZADOR gu
JOIN FK2_MCA_TB_GRUPO g ON gu.FK_GRUPO = g.PK_GRUPO
JOIN FK2_MCA_TB_UTILIZADOR u ON gu.FK_UTILIZADOR = u.PK_UTILIZADOR
JOIN FK2_MCA_TB_TIPO_DE_GRUPO tg ON g.FK_TIPO_DE_GRUPO = tg.PK_TIPO_DE_GRUPO
WHERE u.USERNAME = :username
  AND gu.ACTIVE_STATE = 1
  AND g.ACTIVE_STATE = 1`,
      [username],
    );

    return toLowerCaseKeys(result);
  }
  async getUserPermissionsByUsernameGA(username: string): Promise<any[]> {
    const result = await this.dataSource.query(
      `
      SELECT DISTINCT a.sigla
    FROM FK2_MCA_TB_GRUPO_UTILIZADOR gu
    JOIN FK2_MCA_TB_GRUPO g ON gu.FK_GRUPO = g.PK_GRUPO
    JOIN FK2_MCA_TB_UTILIZADOR u ON gu.FK_UTILIZADOR = u.PK_UTILIZADOR
    JOIN FK2_MCA_TB_GRUPO_ACESSO ga ON ga.fk_grupo = g.pk_grupo
    JOIN FK2_MCA_TB_ACESSO a ON a.pk_acesso = ga.fk_acesso
    WHERE u.USERNAME = :username
      AND gu.ACTIVE_STATE = 1
      AND g.ACTIVE_STATE = 1
      AND a.ACTIVE_STATE = 1
      AND NOT EXISTS (
        SELECT 1
        FROM fk2_mca_tb_grupo_acesso_removido r
        WHERE r.fk_acesso = a.pk_acesso
          AND r.fk_grupo = g.pk_grupo
            AND r.fk_acesso = a.pk_acesso and r.ACTIVE_STATE = 1
      )
      AND NOT EXISTS (SELECT 1
                      FROM FK2_RESTRICOES_ACESSOS RA
                      WHERE RA.CODIGO_ACESSO     = A.PK_ACESSO
                        AND RA.CODIGO_UTILIZADOR = U.PK_UTILIZADOR
                        AND RA.STATUS            = 1)
      `,
      [username],
    );

    return result.map((row: any) => row.SIGLA);
  }
  async checkEmailExistsGA(email: string): Promise<any> {
    const result = await this.dataSource.query(
      `SELECT
    u.CODIGO_IMPORTADO,
    u.NOME,
    u.USERNAME,

    u.CODIGO,
    u.EMAIL,
    u.OBS,
    u.USER_PERTENCE,
    u.CREATED_BY,
    u.LAST_UPDATED_BY,
    u.CREATED_AT,
    u.UPDATED_AT,
    u.LAST_PASSWORD_CHANGE,
    u.ACTIVE_STATE,
    u.FOTONAME,
    u.PRIMEIRO_LOG,
    u.NUMEROMAXIMOTENTATIVAS,
    u.PK_UTILIZADOR
FROM FK2_MCA_TB_UTILIZADOR u
 WHERE LOWER(TRIM(u.EMAIL)) = LOWER(TRIM(:email))`,
      [email.trim()],
    );

    return await toLowerCaseKeys(result[0]);
  }
  async checkEmailExistsPortal(
    email: string,
    matricula?: string,
  ): Promise<any> {
    console.log('email: ', email);
    console.log('matricula: ', matricula);
    let query = `
    SELECT

    u.EMAIL,

    m.Codigo as matricula,
    u.id
    FROM FK2_USERS u
    INNER JOIN fk2_tb_preinscricao p ON p.user_id = u.id
    INNER JOIN fk2_tb_admissao a ON a.pre_incricao = p.Codigo
    INNER JOIN fk2_tb_matriculas m ON m.Codigo_aluno = a.codigo
    WHERE LOWER(TRIM(u.EMAIL)) = LOWER(TRIM(:email))
  `;

    const params: any = {
      email: email.trim(),
    };

    if (matricula?.trim()) {
      query += ` AND m.Codigo = :matricula`;
      params.matricula = matricula.trim();
    }

    const result = await this.dataSource.query(query, params);

    return (await toLowerCaseKeys(result[0])) || null;
  }

  async checkEmailExistsPeopleManagementPortal(email: string): Promise<any> {
    const result1 = await this.dataSource.query(
      `SELECT
       P.EMAIL,gp_us.CODIGO as id 
       from FK2_TB_PESSOA P
      inner join GP_USUARIOS gp_us on gp_us.email = P.email
      where P.email = :email`,
      [email.trim()],
    );
    if (result1.length > 0) {
      return await toLowerCaseKeys(result1[0]);
    }
    const result2 = await this.dataSource.query(`
    SELECT pessoa.EMAIL, pessoa.PK_PESSOA AS ID 
    FROM FK2_MGD_TB_CANDIDATURA candidatura
    INNER JOIN FK2_TB_PESSOA pessoa
      ON pessoa.PK_PESSOA = JSON_VALUE(candidatura.FK_PESSOA, '$.pk_pessoa')
    WHERE  pessoa.EMAIL = :email`, [email.trim()])
    if (result2.length > 0) {
      return await toLowerCaseKeys(result2[0]);
    }
    return null
  }

  async sendRenewData(peloadData: SendRenewDataDto) {
    const { email, enrrolment, phone, details, platform } = peloadData;
    switch (platform) {
      case AuthPlatform.PORTAL:
        const subject =
          '[Portal UMA] Solicitação de Atualização de Dados Cadastrais';

        const htmlContent = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <title>Solicitação de Atualização de Dados - Portal UMA</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8f9fa; margin: 0; padding: 20px; color: #333; }
    .container { max-width: 640px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #f8f9fa, #f8f9fa); padding: 30px 20px; text-align: center; color: #d32f2f; }
    .header img { height: 80px; margin-bottom: 15px; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .body { padding: 30px 40px; line-height: 1.7; }
    .highlight { background: #e3f2fd; padding: 16px; border-radius: 8px; border-left: 5px solid #e63f3fff; margin: 20px 0; }
    .info-grid { display: grid; grid-template-columns: max-content 1fr; gap: 12px 20px; margin: 20px 0; font-size: 15px; }
    .label { font-weight: 600; color: #bb0b0bff; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 13px; color: #666; border-top: 1px solid #eee; }
    .badge { display: inline-block; padding: 6px 14px; background: #d32f2f; color: white; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Cabeçalho -->
    <div class="header">
      <img src="https://universidademetodista.ao/static/media/lgH3c.cdc201af.png" alt="Universidade Metodista de Angola" />
      <h1>Portal Universitário</h1>
    </div>

    <!-- Corpo -->
    <div class="body">
      <h2 style="color: #bb0b0bff; margin-top: 0;">Nova Solicitação de Atualização de Dados</h2>

      <p>Um <strong>usuário do Portal Universitário</strong> submeteu uma solicitação para atualizar ou corrigir os seus dados cadastrais no sistema.</p>

      <div class="highlight">
        <strong>Esta solicitação requer análise da Secretaria Acadêmica.</strong>
      </div>

      <div class="info-grid">
        <span class="label">E-mail informado:</span>
        <span><strong>${email}</strong></span>

        <span class="label">Matrícula:</span>
        <span>${enrrolment ?? '<em>Não informado</em>'}</span>

        <span class="label">Telefone:</span>
        <span>${phone}</span>

        <span class="label">Plataforma:</span>
        <span><span class="badge">${platform.toUpperCase()}</span></span>

        <span class="label">Data/Hora:</span>
        <span>${new Date().toLocaleString('pt-AO', {
          timeZone: 'Africa/Luanda',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}</span>
      </div>

      <hr style="border: 0; border-top: 1px dashed #ccc; margin: 25px 0;">

      <h3 style="color: #bb0b0bff;">Detalhes fornecidos pelo usuário:</h3>
      <blockquote style="background:#f9f9f9; padding:15px 20px; border-left:4px solid #bb0b0bff; margin:15px 0; font-style:italic;">
        ${details.replace(/\n/g, '<br>')}
      </blockquote>

      <p><strong>Ação necessária:</strong> Verificar os dados atuais do estudante e proceder com a atualização no sistema institucional.</p>
    </div>

    <!-- Rodapé -->
    <div class="footer">
      <p><strong>Universidade Metodista de Angola</strong> • Portal Universitário</p>
      <p style="margin:5px 0; color:#888;">Este é um e-mail automático. Não responder.</p>
      <p>© ${new Date().getFullYear()} UMA - Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
`;
        const adminEmail = process.env.ADMIN_EMAIL;
        console.log(adminEmail);

        if (!adminEmail) {
          throw new BadRequestException(
            'E-mail do administrador não configurado.',
          );
        }
        await this.sendEmail(adminEmail, subject, htmlContent, email);
        return {
          message: 'Solicitação de renovação de dados enviada com sucesso.',
        };
      case AuthPlatform.GA:
        throw new BadRequestException(
          'Solicitação de renovação de dados ainda não suportada para GA.',
        );
        break;
      default:
        throw new BadRequestException(
          'Plataforma inválida. Use PORTAL para solicitar renovação de dados.',
        );
    }
  }
  async updatePasswordPortal(
    codigo: number,
    hashedPassword: string,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE FK2_USERS
    SET PASSWORD = :hashedPassword,
        PASSWORD_RESET_REQUIRED = 0
    WHERE ID = :codigo`,
      [hashedPassword, codigo],
    );
  }
  async updatePasswordGA(
    codigo: number,
    hashedPassword: string,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE FK2_MCA_TB_UTILIZADOR
     SET PASSWORD = :hashedPassword,
         PRIMEIRO_LOG = 0
      WHERE PK_UTILIZADOR = :codigo`,
      {
        hashedPassword,
        codigo,
      } as any,
    );
  }

  async updatePasswordPeopleManagement(
    codigo: number,
    hashedPassword: string,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE GP_USUARIOS
       SET SENHA = :hashedPassword,
           PRECISA_MUDAR_SENHA = 0
       WHERE CODIGO = :codigo`,
      [hashedPassword, codigo],
    );
  }


  async updatePasswordPeopleManagementPortal(
    codigo: number,
    hashedPassword: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existsInGP = await queryRunner.query(
        `
      SELECT CODIGO
      FROM GP_USUARIOS
      WHERE CODIGO = :1
      `,
        [codigo],
      );

      if (existsInGP.length > 0) {
        await queryRunner.query(
          `
        UPDATE GP_USUARIOS
        SET
          SENHA = :1,
          PRECISA_MUDAR_SENHA = 0
        WHERE CODIGO = :2
        `,
          [hashedPassword, codigo],
        );

        await queryRunner.commitTransaction();
        return;
      }

      const pessoaGA = await queryRunner.query(
        `
      SELECT
        PK_PESSOA,
        NOME_COMPLETO AS nome_completo,
        FK_GENERO,
        FK_NACIONALIDADE,
        EMAIL,
        NUM_DOC_IDENTIFICACAO AS num_doc_identificacao,
        TELEFONE1,
        TELEFONE2
      FROM FK2_TB_PESSOA
      WHERE PK_PESSOA = :1
      `,
        [codigo],
      );
      if (!pessoaGA.length) {
        throw new Error('Pessoa não encontrada.');
      }

      const pessoa = pessoaGA[0];
      console.log({ pessoa })

      await queryRunner.query(
        `
      INSERT INTO GP_USUARIOS (
        NOME,
        BI,
        TELEFONE,
        TELEFONE_ALTERNATIVO,
        EMAIL,
        SENHA,
        PROVINCIA,
        MUNICIPIO,
        MORADA,
        ESTADO,
        PRECISA_MUDAR_SENHA
      )
      VALUES (
        :1,
        :2,
        :3,
        :4,
        :5,
        :6,
        :7,
        :8,
        :9,
        :10,
        :11
      )
      `,
        [
          toLowerCaseKeys(pessoa).nome_completo,
          toLowerCaseKeys(pessoa).num_doc_identificacao,
          toLowerCaseKeys(pessoa).telefone1,
          toLowerCaseKeys(pessoa).telefone2,
          toLowerCaseKeys(pessoa).email,
          hashedPassword,
          'Unknown',
          'Unknown',
          'Unknown',
          1,
          0,
        ],
      );


      const [usuario] = await queryRunner.query(`
      SELECT CODIGO
      FROM GP_USUARIOS
      WHERE EMAIL = :1
      ORDER BY CODIGO DESC
      FETCH FIRST 1 ROW ONLY
    `, [toLowerCaseKeys(pessoa).email]);
      console.log({ usuario: toLowerCaseKeys(usuario) });
      await queryRunner.query(
        `
      INSERT INTO GP_CANDIDATOS (
        CODIGO_USUARIO,
        ESTADO
      )
      VALUES (
        :1,
        :2
      )
      `,
        [
          toLowerCaseKeys(usuario).codigo,
          'APROVADO',
        ],
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      console.error(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Erro ao atualizar senha');
    } finally {
      await queryRunner.release();
    }
  }
  async getPortalUserData(
    userId: number,
    codigoPreinscricao?: number,
    ignorarPreinscricao: boolean = false,
    semestre?: number,
  ): Promise<any> {
    const result = await this.dataSource.query(
      `
SELECT
  us.id                         AS user_id,
  us.name                       AS nome_completo,
  us.email                      AS email,
  us.telefone                   AS telefone,
  us.GRAUACADEMICO              AS grau_academico,
  us.numero_documento           AS numero_documento,

  p.Codigo                      AS codigo_preinscricao,
  p.Nome_Completo,
  p.Sexo,
  p.Data_Nascimento,
  p.Email,
  p.Bilhete_Identidade,
  us.Tipo_de_Documento          AS tipo_documento,
  p.Contactos_Telefonicos,
  p.saldo_reset                 AS saldo_reset,
  p.saldo_reset_anter           AS saldo_reset_anter,
  p.codigo_tipo_candidatura     AS codigo_tipo_candidatura,
  p.Curso_Candidatura           AS Curso_Candidatura,

  a.codigo                      AS codigo_admissao,
  a.data                        AS data_admissao,
  a.mediafinal                  AS media_final,

  m.Codigo                      AS codigo_matricula,
  m.Data_Matricula,
  m.estado_matricula,
  m.Codigo_Curso,
  m.Codigo_Aluno,

  c.Designacao                  AS curso,
  c.numero_max_cadeiras         AS max_cadeiras_curso,
  t.Designacao                  AS turma,
  s.Designacao                  AS sala,
  per.Designacao                AS periodo,
  per.Codigo                    AS periodoId,
  tc.sigla                      AS sigla_tipo_candidatura,
  tc.Designacao                 AS tipo_candidatura_designacao,

  us.foto                       AS foto,
  us.updated_at                 AS data_actualizacao,

  polos.id                      AS poloId,
  c.duracao                     AS curso_duracao,
  cr.duracao                    AS curso_duracao_candidatura,
  polos.designacao              AS polo,
  cr.Designacao                 AS curso_candidatura_designacao,

CASE
  -- Criação de nova pré-inscrição: força estado de candidato sem pré-inscrição
  WHEN :ignorarPreinscricao1 = 1 THEN 'SEM_PRE_INSCRICAO'

  WHEN p.Codigo IS NULL THEN 'SEM_PRE_INSCRICAO'

  ELSE
    CASE
      -- Ramo MESTRADO/POS-GRADUACAO
      WHEN p.codigo_tipo_candidatura IN (2, 3) THEN
        CASE
          WHEN m.Codigo IS NULL AND a.codigo IS NULL
            THEN 'PREINSCRITO_MESTRADO_POS_GRADUACAO'

          WHEN m.Codigo IS NULL AND a.codigo IS NOT NULL
            THEN 'ADMITIDO_SEM_MATRICULA_MESTRADO_POS_GRADUACAO'

          WHEN m.Codigo IS NOT NULL AND TRIM(UPPER(m.ESTADO_MATRICULA)) = 'DIPLOMADO'
            THEN 'DIPLOMADO_MESTRADO_POS_GRADUACAO'

          WHEN m.Codigo IS NOT NULL AND TRIM(UPPER(m.ESTADO_MATRICULA)) = 'TRANSFERIDO'
            THEN 'TRANSFERIDO_MESTRADO_POS_GRADUACAO'

          WHEN m.Codigo IS NOT NULL
            THEN 'ALUNO_MATRICULADO_MESTRADO_POS_GRADUACAO'

          ELSE 'PREINSCRITO_MESTRADO_POS_GRADUACAO'
        END

      -- Ramo normal (demais tipos de candidatura)
      ELSE
        CASE
          WHEN m.Codigo IS NULL AND a.codigo IS NULL
            THEN 'PREINSCRITO'

          WHEN m.Codigo IS NULL AND a.codigo IS NOT NULL AND a.MEDIAFINAL >= 9.5
            THEN 'ADMITIDO_SEM_MATRICULA'

       --   WHEN m.Codigo IS NULL AND a.codigo IS NOT NULL AND a.MEDIAFINAL < 9.5
       --     THEN 'NAO_ADMITIDO'

          WHEN m.Codigo IS NOT NULL AND TRIM(UPPER(m.ESTADO_MATRICULA)) = 'DIPLOMADO'
            THEN 'DIPLOMADO'

          WHEN m.Codigo IS NOT NULL AND TRIM(UPPER(m.ESTADO_MATRICULA)) = 'TRANSFERIDO'
            THEN 'TRANSFERIDO'

          WHEN m.Codigo IS NOT NULL
            THEN 'ALUNO_MATRICULADO'

          ELSE 'PREINSCRITO'
        END
    END
END AS estado_aluno,
/* =========================
   CONFIRMAÇÕES (JSON)
========================= */
(
  SELECT NVL(JSON_ARRAYAGG(j), '[]')
  FROM (
    SELECT JSON_OBJECT(
      'codigo'           VALUE conf2.Codigo,
      'codigo_matricula' VALUE conf2.Codigo_Matricula,
      'ano_lectivo'      VALUE conf2.Codigo_Ano_lectivo,
      'estado'           VALUE conf2.Estado,
      'classe'           VALUE conf2.Classe,
      'cadeirante'       VALUE conf2.Cadeirante,
      'canal'            VALUE conf2.canal,
      'semestre'         VALUE conf2.semestre
    ) AS j
    FROM fk2_tb_confirmacoes conf2
    WHERE conf2.Codigo_Matricula = m.Codigo
      AND conf2.Classe IS NOT NULL
      AND (:semestre1 IS NULL OR conf2.semestre = :semestre2)
    ORDER BY conf2.Codigo DESC,
             conf2.Codigo_Ano_lectivo DESC,
             conf2.Semestre DESC
    FETCH FIRST 1 ROWS ONLY
  ) x
) AS confirmacoes

FROM fk2_users us

/* PREINSCRIÇÃO */
LEFT JOIN (
  SELECT * FROM (
    SELECT p.*,
           ROW_NUMBER() OVER (PARTITION BY p.user_id ORDER BY p.Codigo DESC) rn
    FROM fk2_tb_preinscricao p
    WHERE p.DELETED_AT IS NULL
      AND (:codigoPreinscricao1 IS NULL OR p.Codigo = :codigoPreinscricao2)
  )
  WHERE rn = 1
) p ON p.user_id = us.id

/* ADMISSÃO */
LEFT JOIN (
  SELECT * FROM (
    SELECT a.*,
           ROW_NUMBER() OVER (PARTITION BY a.pre_incricao ORDER BY a.codigo DESC) rn
    FROM fk2_tb_admissao a
  )
  WHERE rn = 1
) a ON a.pre_incricao = p.Codigo

/* MATRÍCULA */
LEFT JOIN (
  SELECT * FROM (
    SELECT m.*,
           ROW_NUMBER() OVER (PARTITION BY m.Codigo_Aluno ORDER BY m.Codigo DESC) rn
    FROM fk2_tb_matriculas m
  )
  WHERE rn = 1
) m ON m.Codigo_Aluno = a.codigo

/* CONFIRMAÇÕES PRINCIPAL */
LEFT JOIN (
  SELECT * FROM (
    SELECT conf.*,
           ROW_NUMBER() OVER (
             PARTITION BY conf.Codigo_Matricula
             ORDER BY
               CASE WHEN conf.semestre = :semestre3 THEN 0 ELSE 1 END ASC,
               conf.Codigo DESC,
               conf.Codigo_Ano_lectivo DESC,
               conf.Semestre DESC
           ) rn
    FROM fk2_tb_confirmacoes conf
    WHERE conf.Classe IS NOT NULL
      AND (conf.semestre = :semestre4 OR conf.semestre IS NULL)
  ) t
  WHERE rn = 1
) conf ON conf.Codigo_Matricula = m.Codigo

LEFT JOIN fk2_tb_cursos   c     ON c.Codigo  = m.Codigo_Curso
LEFT JOIN fk2_tb_cursos   cr    ON cr.Codigo = p.Curso_Candidatura
LEFT JOIN fk2_tb_turmas   t     ON t.Codigo  = conf.Codigo_Turma
LEFT JOIN fk2_tb_salas    s     ON s.Codigo  = t.Codigo_Sala
LEFT JOIN fk2_tb_tipo_candidatura tc ON tc.id = p.codigo_tipo_candidatura
LEFT JOIN fk2_tb_periodos per   ON per.Codigo = p.Codigo_Turno
LEFT JOIN fk2_polos       polos ON polos.id  = p.polo_id

WHERE us.id = :userId
`,
      {
        semestre1: semestre,
        semestre2: semestre,
        semestre3: semestre,
        semestre4: semestre,
        codigoPreinscricao1: codigoPreinscricao,
        codigoPreinscricao2: codigoPreinscricao,
        ignorarPreinscricao1: ignorarPreinscricao ? 1 : 0,
        userId,
      } as any,
    );

    if (!result || result.length === 0) {
      throw new NotFoundException('Utilizador não encontrado');
    }

    const row = await toLowerCaseKeys(result[0]);

    if (row.confirmacoes && typeof row.confirmacoes === 'string') {
      try {
        row.confirmacoes = JSON.parse(row.confirmacoes);
      } catch {
        row.confirmacoes = [];
      }
    }

    return row;
  }
  async getPreInscricoesByUser(userId: number): Promise<any[]> {
    const result = await this.dataSource.query(
      `
SELECT
  p.Codigo                       AS codigo_preinscricao,
  p.Curso_Candidatura            AS codigo_curso,
  cr.Designacao                  AS curso,
  p.codigo_tipo_candidatura      AS codigo_tipo_candidatura,
  tc.Designacao                  AS tipo_candidatura,
  tc.sigla                       AS sigla_tipo_candidatura,
  polos.Designacao               AS polo,
  p.Data_Preescrincao              AS data_preinscricao,
  p.ESTADO_PREISCRICAO_CANDIDATO AS estado
FROM fk2_tb_preinscricao      p
LEFT JOIN fk2_tb_cursos           cr    ON cr.Codigo = p.Curso_Candidatura
LEFT JOIN fk2_tb_tipo_candidatura tc    ON tc.id     = p.codigo_tipo_candidatura
LEFT JOIN fk2_polos               polos ON polos.id  = p.polo_id
WHERE p.user_id = :userId
  AND p.DELETED_AT IS NULL
ORDER BY p.Codigo DESC
      `,
      { userId } as any,
    );

    return toLowerCaseKeys(result);
  }
  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    from?: string,
  ) {
    await this.mailerService.sendMail({
      to: to,
      // from: from ? undefined : process.env.MAIL_USER,
      // cc: from ? undefined : process.env.MAIL_USER_CC,
      subject: subject,
      html: htmlContent,
    });
  }

  async queueOperatorBox(
    codigoUtilizador: number,
  ): Promise<{ message: string; taskId: string | undefined }> {
    const job = await this.operator_boxQueue.add(
      'processOperatorBox',
      {
        codigoUtilizador,
      },
      {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: 5000,
      },
    );
    return {
      message: 'Processamento iniciado: Operador de Caixa ...',
      taskId: job.id,
    };
  }
  private resetPath(platform: AuthPlatform): string {
    switch (platform) {
      case AuthPlatform.GA:
        return '/auth/primeiro-acesso/redefinir';
      case AuthPlatform.PORTAL:
        return '/auth/renovar-senha';
      case AuthPlatform.PEOPLE_MANAGEMENT_PORTAL:
        return '/reset-password';
      default:
        throw new BadRequestException('Plataforma não suportada.');
    }
  }
  private subject(platform: AuthPlatform): string {
    switch (platform) {
      case AuthPlatform.GA:
        return "Configuração Inicial de Senha - Portal Académico GA";
      case AuthPlatform.PORTAL:
        return "Redefinição de Senha - Portal Académico";
      case AuthPlatform.PEOPLE_MANAGEMENT_PORTAL:
        return "Redefinição de Senha - Portal de Candidatura";
      default:
        throw new BadRequestException('Plataforma não suportada.');
    }
  }

}
