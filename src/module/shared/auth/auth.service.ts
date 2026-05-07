import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { DataSource } from 'typeorm';
import { AuthPlatform, LogoutDto, MakloggedOutDto, SignInDto } from './dto/signIn.dto';
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



@Injectable()
export class AuthService {
  constructor(private readonly dataSource: DataSource,
    private hashService: HashService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly userSignInService: UserSignInService
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
          throw new ForbiddenException('A sua conta está inativa. Contacte o administrador do sistema.');
        }
        groups = await this.findGroupsByUserGA(username)

        if (!user) break;

        roles = await this.checkUserRoles(username);
        permissions = await this.getUserPermissionsByUsernameGA(username);

        await this.userSignInService.registrarOuAtualizarAcesso(
          user.pk_utilizador,
          ip,
          true,
        );
        break;

      /* ===================== PORTAL ===================== */
      case AuthPlatform.PORTAL:
        user = await this.findUserByUsernameEmailOrDocumentoPORTAL(username);

        if (!user) break;

        await this.userSignInService.registrarOuAtualizarAcesso(
          user.id,
          ip,
          true,
        );
        break;

      default:
        throw new BadRequestException('Plataforma inválida. Use GA ou PORTAL.');
    }


    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    /* 🔐 Validação de estado apenas para GA */
    if (platform === AuthPlatform.GA && user.active_state !== 1) {
      throw new BadRequestException(
        'Usuário inativo, contate o administrador do sistema.',
      );
    }

    /* 🔑 Validação da senha */
    const verificarHash = await this.hashService.verificarHash(
      password,
      user.password,
    );

    if (!verificarHash) {
      throw new BadRequestException('Erro ao acessar a Conta');
    }

    /* 🎫 Payload por plataforma */
    const payload =
      platform === AuthPlatform.PORTAL
        ? {
          username: user.username,
          sub: user.id,
          email: user.email,
          codigoPreinscricao: user.codigo_preinscricao,
          platform,
        }
        : {
          username: user.username,
          nome: user.nome,
          sub: user.pk_utilizador,
          permissions,
          roles,
          platform,
        };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      expires_in: 900,

      user: { ...user, password: undefined },
      ...(platform === AuthPlatform.GA && { roles, groups, permissions }),
      mensagem: 'Login realizado com sucesso. Utilize o token JWT nas próximas chamadas.',
    };
  }
  async UserupdatePassword(dto: UserUpdatePasswordDto, usuarioLogadoId: number): Promise<{ message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //
      if (dto.novaSenha !== dto.confirmarNovaSenha) {
        throw new BadRequestException('A nova senha e a confirmação não coincidem');
      }

      if (dto.senhaAtual === dto.novaSenha) {
        throw new BadRequestException('A nova senha não pode ser igual à senha antiga');
      }
      // Verifica se o utilizador existe
      const [user] = await queryRunner.manager.query(
        `SELECT PASSWORD FROM FK2_MCA_TB_UTILIZADOR WHERE PK_UTILIZADOR = ${usuarioLogadoId} AND ROWNUM = 1`
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
      const hashedPassword: string = await this.hashService.criarHash(dto.novaSenha);


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
    const { platform } = logoutDto
    switch (platform) {
      case AuthPlatform.GA:

        await this.userSignInService.makloggedOut(utilizadorId)

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
    plataformDto: GetCurrentPlataformDto,
  ): Promise<any> {
    const { platform } = plataformDto;

    let user: any;
    let groups: any;
    let roles: any = null;
    let isAuthenticated = true;
    let permissions: any = null;

    switch (platform) {
      /* ===================== GA ===================== */
      case AuthPlatform.GA:
        user = await this.findUserByusernameGA(userPayload.username);
        roles = await this.checkUserRoles(userPayload.username);
        groups = await this.findGroupsByUserGA(userPayload.username)
        permissions = await this.getUserPermissionsByUsernameGA(userPayload.username);

        if (!user) break;

        if (user.active_state !== 1) {
          throw new UnauthorizedException(
            'Usuário inativo na plataforma GA',
          );
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
        user = await this.getPortalUserData(userPayload.sub);
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
      user: user
        ? { ...user, password: undefined }
        : null,
      ...(platform === AuthPlatform.GA && {
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

      default:
        throw new BadRequestException('Plataforma inválida. Use GA ou PORTAL.');
    }
  }
  async makloggedOut(makloggedOutDto: MakloggedOutDto, codigoutilizador: number) {
    await this.userSignInService.makloggedOut(codigoutilizador)
    return {
      message: 'Logout efetuado com sucesso',
    };
  }
  async SendchangePassword(dto: CheckEmailExistsDto) {
    const { email, platform } = dto;

    // Validação inicial da plataforma
    if (![AuthPlatform.GA, AuthPlatform.PORTAL].includes(platform)) {
      throw new BadRequestException('Plataforma inválida. Use GA ou PORTAL.');
    }

    let user: any; // Ajuste o tipo conforme tua entity (UserGA | UserPortal | etc)
    let resetUrlBase: string;
    let userId: number

    switch (platform) {
      case AuthPlatform.GA:
        user = await this.checkEmailExistsGA(email);
        resetUrlBase = process.env.URL_GA || 'http://localhost:3000';
        userId = user?.pk_utilizador;
        break;

      case AuthPlatform.PORTAL:
        user = await this.checkEmailExistsPortal(email);
        resetUrlBase = process.env.URL_PORTAL || 'http://localhost:3001';
        userId = user.id;
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
    const resetPath = platform === AuthPlatform.GA
      ? '/auth/primeiro-acesso/redefinir'   // ou o path que usas no frontend GA
      : '/auth/renovar-senha';

    const resetLink = `${resetUrlBase}${resetPath}/${resetToken}`;

    console.log(`[Reset Link - ${platform}]`, resetLink); // para debug

    // Envio de email (podes parametrizar o assunto e template por plataforma se quiseres)
    const subject = platform === AuthPlatform.GA
      ? 'Configuração Inicial de Senha - Portal Académico GA'
      : 'Redefinição de Senha - Portal Académico';

    const html = `
    <p>Olá,</p>
    <p>Recebemos um pedido para ${platform === AuthPlatform.GA ? 'configurar' : 'redefinir'} a sua senha.</p>
    <p>Clique no link abaixo para prosseguir (válido por 15 minutos):</p>
    <p><a href="${resetLink}">${resetLink}</a></p>
    <p>Se não solicitou esta ação, ignore este email.</p>
    <p>Atenciosamente,<br>Equipa do Sistema Académico</p>
  `;

    await this.sendEmail(email, subject, html);

    return {
      message: `Email de ${platform === AuthPlatform.GA ? 'configuração' : 'redefinição'} de senha enviado com sucesso.`,
    };
  }
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword, platform } = resetPasswordDto;

    // 1. Validar plataforma logo no início
    if (![AuthPlatform.GA, AuthPlatform.PORTAL].includes(platform)) {
      throw new BadRequestException('Plataforma inválida. Use GA ou PORTAL.');
    }

    // 2. Verificar e decodificar o token JWT
    let payload: { sub: number | string; email: string; platform?: AuthPlatform };
    try {
      payload = this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    // 3. Verificar se o token é da plataforma correta (segurança extra)
    if (payload.platform && payload.platform !== platform) {
      throw new BadRequestException('Token não corresponde à plataforma informada.');
    }

    let userId: any;
    let message: string;

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

        message = 'Senha configurada com sucesso no GA. Pode agora fazer login.';
        break;
      }

      case AuthPlatform.PORTAL: {
        // Para PORTAL, usamos o email do payload para buscar o utilizador
        const user = await this.checkEmailExistsPortal(payload.email);
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
    }

    return { message };
  }


  async findUserByusernameGA(username: string): Promise<any> {
    const result = await this.dataSource.query(`SELECT
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
WHERE u.USERNAME= :username`, [username]);

    return await toLowerCaseKeys(result[0]);

  }


  async findUserByIdGA(codigo: number): Promise<any> {
    const result = await this.dataSource.query(`SELECT
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
WHERE u.PK_UTILIZADOR= :codigo`, [codigo]);

    return await toLowerCaseKeys(result[0]);

  }
  async findUserByUsernameEmailOrDocumentoPORTAL(
    value: string,
  ): Promise<any> {
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
      p.NOME_COMPLETO AS nomeCompleto
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
      [UserRole.DIREITOR_CURSO]: false,
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
    const result = await this.dataSource.query(`SELECT
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
  AND g.ACTIVE_STATE = 1`, [username]);

    return toLowerCaseKeys(result);
  }
  async getUserPermissionsByUsernameGA(username: string): Promise<any[]> {
    const result = await this.dataSource.query(`
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
      )`, [username]);

    return result.map((row: any) => row.SIGLA);
  }
  async checkEmailExistsGA(email: string): Promise<any> {
    const result = await this.dataSource.query(`SELECT
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
 WHERE LOWER(TRIM(u.EMAIL)) = LOWER(TRIM(:email))`, [email.trim()]);

    return await toLowerCaseKeys(result[0]);
  }
  async checkEmailExistsPortal(email: string): Promise<any> {
    const result = await this.dataSource.query(
      `
    SELECT *
    FROM FK2_USERS u
    WHERE LOWER(TRIM(u.EMAIL)) = LOWER(TRIM(:email))
    `,
      [email.trim()]
    );

    return toLowerCaseKeys(result[0]);
  }

  async sendRenewData(peloadData: SendRenewDataDto) {
    const { email, enrrolment, phone, details, platform } = peloadData;
    switch (platform) {
      case AuthPlatform.PORTAL:
        const subject = '[Portal UMA] Solicitação de Atualização de Dados Cadastrais';

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
          throw new BadRequestException('E-mail do administrador não configurado.');
        }
        await this.sendEmail(adminEmail, subject, htmlContent, email);
        return { message: 'Solicitação de renovação de dados enviada com sucesso.' };
      case AuthPlatform.GA:
        throw new BadRequestException('Solicitação de renovação de dados ainda não suportada para GA.');
        break;
      default:
        throw new BadRequestException('Plataforma inválida. Use PORTAL para solicitar renovação de dados.');
    }


  }
  async updatePasswordPortal(codigo: number, hashedPassword: string): Promise<void> {
    await this.dataSource.query(`UPDATE FK2_USERS
    SET PASSWORD = :hashedPassword
    WHERE ID = :codigo`, [hashedPassword, codigo]);
  }
  async updatePasswordGA(codigo: number, hashedPassword: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE FK2_MCA_TB_UTILIZADOR
     SET PASSWORD = :hashedPassword,
         PRIMEIRO_LOG = 0
      WHERE PK_UTILIZADOR = :codigo`,
      {
        hashedPassword,
        codigo,
      } as any
    );
  }
  async getPortalUserData(userId: number, semestre?: string): Promise<any> {
    const result = await this.dataSource.query(
      `
    SELECT
      us.id                         AS user_id,
      us.name                       AS nome_completo,
      us.email                      AS email,
      us.telefone                   AS telefone,
      us.numero_documento           AS numero_documento,
      p.Codigo                      AS codigo_preinscricao,
      p.Nome_Completo,
      p.Sexo,
      p.Data_Nascimento,
      p.Email,
      p.Bilhete_Identidade,
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
      us.foto                       AS foto,
      us.updated_at                 AS data_actualizacao,
      polos.id                      AS poloId,
      c.duracao                     AS curso_duracao,
      cr.duracao                    AS curso_duracao_candidatura,
      polos.designacao              AS polo,
      cr.Designacao                 AS curso_candidatura_designacao,

      CASE
        WHEN p.Codigo IS NULL                          THEN 'SEM_PRE_INSCRICAO'
        WHEN m.Codigo IS NULL AND a.codigo IS NOT NULL THEN 'ADMITIDO_SEM_MATRICULA'
        WHEN m.Codigo IS NOT NULL                      THEN 'ALUNO_MATRICULADO'
        ELSE                                                'PREINSCRITO'
      END AS estado_aluno,

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
                   'canal'            VALUE conf2.canal
                 ) AS j
          FROM fk2_tb_confirmacoes conf2
          WHERE conf2.Codigo_Matricula = m.Codigo
            AND conf2.Classe IS NOT NULL
            AND (:semestre1 IS NULL OR conf2.semestre = :semestre2)
              -- So traz se estiver ativo 
            AND conf2.ESTADO = 1
          ORDER BY conf2.Codigo_Ano_lectivo DESC, conf2.Classe DESC
          FETCH FIRST 1 ROWS ONLY
        )
      ) AS confirmacoes

    FROM fk2_users us

      LEFT JOIN (
        SELECT * FROM (
          SELECT p.*, ROW_NUMBER() OVER (PARTITION BY p.user_id ORDER BY p.Codigo DESC) AS rn
          FROM fk2_tb_preinscricao p
        ) WHERE rn = 1
      ) p ON p.user_id = us.id

      LEFT JOIN (
        SELECT * FROM (
          SELECT a.*, ROW_NUMBER() OVER (PARTITION BY a.pre_incricao ORDER BY a.codigo DESC) AS rn
          FROM fk2_tb_admissao a
        ) WHERE rn = 1
      ) a ON a.pre_incricao = p.Codigo

      LEFT JOIN (
        SELECT * FROM (
          SELECT m.*, ROW_NUMBER() OVER (PARTITION BY m.Codigo_Aluno ORDER BY m.Codigo DESC) AS rn
          FROM fk2_tb_matriculas m
        ) WHERE rn = 1
      ) m ON m.Codigo_Aluno = a.codigo

      LEFT JOIN (
        SELECT * FROM (
          SELECT conf.*,
                 ROW_NUMBER() OVER (
                   PARTITION BY conf.Codigo_Matricula
                   ORDER BY
                     CASE WHEN conf.semestre = :semestre3 THEN 0 ELSE 1 END ASC,
                     conf.Codigo_Ano_lectivo DESC,
                     conf.Classe DESC
                 ) AS rn
          FROM fk2_tb_confirmacoes conf
          WHERE conf.Classe IS NOT NULL
            AND (conf.semestre = :semestre4 OR conf.semestre IS NULL)
            -- So traz se estiver ativo 
            AND conf.ESTADO = 1
        ) WHERE rn = 1
      ) conf ON conf.Codigo_Matricula = m.Codigo

      LEFT JOIN fk2_tb_cursos         c     ON c.Codigo     = m.Codigo_Curso
      LEFT JOIN fk2_tb_cursos         cr    ON cr.Codigo    = p.Curso_Candidatura
      LEFT JOIN fk2_tb_turmas         t     ON t.Codigo     = conf.Codigo_Turma
      LEFT JOIN fk2_tb_salas          s     ON s.Codigo     = t.Codigo_Sala
      LEFT JOIN fk2_tb_periodos       per   ON per.Codigo   = p.Codigo_Turno
      LEFT JOIN fk2_polos             polos ON polos.id     = p.polo_id
      

    WHERE us.id = :userId
    `,
      { semestre1: semestre, semestre2: semestre, semestre3: semestre, semestre4: semestre, userId } as any,
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
  async sendEmail(to: string, subject: string, htmlContent: string, from?: string) {
    await this.mailerService.sendMail({
      to: to,
      // from: from ? undefined : process.env.MAIL_USER,
      // cc: from ? undefined : process.env.MAIL_USER_CC,
      subject: subject,
      html: htmlContent,
    });
  }
}
