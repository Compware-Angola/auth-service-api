import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';

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
    let permissions: any = null;


    switch (platform) {
      /* ===================== GA ===================== */
      case AuthPlatform.GA:
        user = await this.findUserByusernameGA(username);

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
      throw new BadRequestException('Senha inválida');
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
      ...(platform === AuthPlatform.GA && { roles, permissions }),
      mensagem: 'Login realizado com sucesso. Utilize o token JWT nas próximas chamadas.',
    };
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
    let roles: any = null;
    let isAuthenticated = true;
    let permissions: any = null;

    switch (platform) {
      /* ===================== GA ===================== */
      case AuthPlatform.GA:
        user = await this.findUserByusernameGA(userPayload.username);
        roles = await this.checkUserRoles(userPayload.username);
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
        user = userPayload;
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
  async checkUserRoles(username: string): Promise<UserRoles> {
    const roles: UserRoles = {
      [UserRole.DOCENTE]: false,
      [UserRole.DIREITOR_CURSO]: false,

      // outros roles iniciam como false
    };

    // 1. Verificar se é docente
    const docenteResult = await this.dataSource.query(`
    SELECT td.CODIGO
    FROM FK2_MGD_TB_DOCENTE td
    INNER JOIN FK2_MCA_TB_UTILIZADOR tu 
      ON json_value(td.CODIGO_UTILIZADOR, '$.pk') = tu.PK_UTILIZADOR
    WHERE tu.USERNAME = :username
  `, [username]);

    if (docenteResult && docenteResult.length > 0) {
      roles[UserRole.DOCENTE] = true;
    }
    // 2. outros roles aqui

    return roles;
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
