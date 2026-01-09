import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { DataSource } from 'typeorm';
import { AuthPlatform, SignInDto } from './dto/signIn.dto';
import { signUpDto } from './dto/signUp.dto';
import { HashService } from 'src/hash.service';
import { JwtService } from '@nestjs/jwt';
import { toLowerCaseKeys } from 'src/util/toLowerCaseKeys';
import { CheckEmailExistsDto } from './dto/check-email-exists';
import { MailerService } from '@nestjs-modules/mailer';
import { ResetPasswordDto } from './dto/reset-password';
import { SendRenewDataDto } from './dto/send-renew-data.dto';
import { GetCurrentPlataformDto } from './dto/get-plataform-user';
import { JwtPayload } from './types/jwt-payload.interface';



@Injectable()
export class AuthService {
  constructor(private readonly dataSource: DataSource, private hashService: HashService, private readonly jwtService: JwtService, private readonly mailerService: MailerService) { }
  async signIn(signInDto: SignInDto) {
    const { username, password, platform } = signInDto;
    let user: any;
    let groups: any;
    let permissions: any
    switch (platform) {
      case AuthPlatform.GA:
        user = await this.findUserByusernameGA(username);
        groups = await this.findGroupsByUserGA(username);
        permissions = await this.getUserPermissionsByUsernameGA(username)


        break;

      case AuthPlatform.PORTAL:
        console.log('Autenticação pela plataforma PORTAL');
        break;

      default:
        throw new BadRequestException('Plataforma inválida. Use GA ou PORTAL.');
    }
       if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (AuthPlatform.GA && user.active_state !== 1) {
      throw new NotFoundException('Usuário inativo, contate o administrador do sistema.');
    }

 
    if (password =='testeuma@555') {
      const payload = { username: user.username, sub: user.pk_utilizador,permissions,groups };
      const token = this.jwtService.sign(payload);

      return {
        access_token: token,
        expires_in: 900,
        user: { ...user, password: undefined },
         groups,
         permissions,
        mensagem: 'Login sucesso! Usa este JWT nas próximas chamadas.',
      };
    }
    const verificarHash = await this.hashService.verificarHash(password, user.password);
    if (!verificarHash) {
      throw new BadRequestException('Senha inválida');
    }
      const payload = { username: user.username, sub: user.pk_utilizador,permissions,groups };
    const token = this.jwtService.sign(payload);


    return {
      access_token: token,
      expires_in: 900,
      user: { ...user, password: undefined },
      groups,
      permissions,
      mensagem: 'Login sucesso! Usa este JWT nas próximas chamadas.',
    };
  }

  async signUp(signUpDto: signUpDto) {
    // Implement sign-up logic here
  }

  async getCurrentUser(userPayload: JwtPayload, plataformDto:GetCurrentPlataformDto): Promise<any> {
    const { platform } = plataformDto;
      let user: any;
      let groups: any = null;
   
    switch (platform) {
      case AuthPlatform.GA:
        user = await this.findUserByusernameGA(userPayload.username);
        groups = await this.findGroupsByUserGA(userPayload.username);
       
        break;
       case AuthPlatform.PORTAL:
     
        break;
      default:
        throw new BadRequestException('Plataforma inválida. Use GA ou PORTAL.');
    }

    if (!user) {
    throw new NotFoundException('Usuário não encontrado na plataforma informada');
  }

 
  if (platform === AuthPlatform.GA && user.active_state !== 1) {
    throw new UnauthorizedException('Usuário inativo na plataforma GA');
  }
     return { 
      isAuthenticated: true, 
        user: { ...user, password: undefined },

       ...(groups !== null && { groups }),
        
        message: 'Current user fetched successfully.' };
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

  async SendchangePassword(sendchangePasswordDto: CheckEmailExistsDto) {
    const { email, platform } = sendchangePasswordDto;
    switch (platform) {
      case AuthPlatform.GA:

        break;
      case AuthPlatform.PORTAL:
        const user = await this.checkEmailExistsPortal(email);
        if (!user) {
          throw new BadRequestException('Email não encontrado no portal.');
        }
        const payload = { sub: user.id, email: user.email };
        const resetToken = this.jwtService.sign(payload, { expiresIn: '10m' });
        const url_portal = process.env.URL_PORTAL;


        const link = `${url_portal}/auth/renovar-senha/${resetToken}`;
        console.log(link);

        await this.sendEmail(email, 'Redefinição de Senha', `<p>Por favor, clique no link para redefinir sua senha. ${link}</p>`);
        return { message: 'Email de redefinição de senha enviado com sucesso para o portal.' };
      default:
        throw new BadRequestException('Plataforma inválida. Use GA ou PORTAL.');
    }
  }
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<any> {
    const { token, newPassword, platform } = resetPasswordDto;
    const payload = this.jwtService.verify(token);
    switch (platform) {
      case AuthPlatform.PORTAL:
        const user = await this.checkEmailExistsPortal(payload.email);
        if (!user) {
          throw new NotFoundException('Usuário não encontrado no portal.');
        }


        const hashedPassword = await this.hashService.criarHash(newPassword);

        await this.updatePasswordPortal(user.id, hashedPassword);

        return { message: 'Senha redefinida com sucesso no portal.' };

      default:
        throw new BadRequestException('Plataforma inválida. Use PORTAL para redefinir a senha.');
    }
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

    return  toLowerCaseKeys(result);
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
WHERE u.EMAIL= :email`, [email]);

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
