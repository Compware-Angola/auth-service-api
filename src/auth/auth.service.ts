import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { DataSource, Not } from 'typeorm';
import { AuthPlatform, SignInDto } from './dto/signIn.dto';
import { signUpDto } from './dto/signUp.dto';
import { HashService } from 'src/hash.service';
import { JwtService } from '@nestjs/jwt';
import { toLowerCaseKeys } from 'src/util/toLowerCaseKeys';
import { CheckEmailExistsDto } from './dto/check-email-exists';
import { MailerService } from '@nestjs-modules/mailer';
import { ResetPasswordDto } from './dto/reset-password';



@Injectable()
export class AuthService {
  constructor(private readonly dataSource: DataSource, private hashService: HashService, private readonly jwtService: JwtService, private readonly mailerService: MailerService) { }
  async signIn(signInDto: SignInDto) {
    const { username, password, platform } = signInDto;
    let user: any;
    switch (platform) {
      case AuthPlatform.GA:
        user = await this.findUserByusernameGA(username);

        break;

      case AuthPlatform.PORTAL:
        console.log('Autenticação pela plataforma PORTAL');
        break;

      default:
        throw new BadRequestException('Plataforma inválida. Use GA ou PORTAL.');
    }
    if (AuthPlatform.GA && user.active_state !== 1) {
      throw new NotFoundException('Usuário inativo, contate o administrador do sistema.');
    }

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    const verificarHash = await this.hashService.verificarHash(password, user.password);
    if (!verificarHash) {
      throw new BadRequestException('Senha inválida');
    }

    const payload = { username: user.username, sub: user.pk_utilizador, };
    const token = this.jwtService.sign(payload, { expiresIn: '15m' });

    return {
      access_token: token,
      expires_in: 900,
      user: { ...user, password: undefined },
      mensagem: 'Login sucesso! Usa este JWT nas próximas chamadas.',
    };
  }

  async signUp(signUpDto: signUpDto) {
    // Implement sign-up logic here
  }

  async checkEmailExists(chechEmailExists: CheckEmailExistsDto): Promise<any> {

    const { email, platform } = chechEmailExists;
    switch (platform) {
      case AuthPlatform.GA:
        const existsGA = await this.checkEmailExistsGA(email);
        if (!existsGA) {
          throw new NotFoundException('Email não encontrado na GA.');
        }
        return { email, exists: existsGA };

      case AuthPlatform.PORTAL:
        const existsPortal = await this.checkEmailExistsPortal(email);
        if (!existsPortal) {
          throw new NotFoundException('Email não encontrado no portal.');
        }
        console.log(existsPortal);
        
        return { email, exists: {...existsPortal,password:undefined} };

      default:
        throw new BadRequestException('Plataforma inválida. Use GA ou PORTAL.');
    }
  }

  async SendchangePassword(sendchangePasswordDto: CheckEmailExistsDto) {
    const { email, platform } = sendchangePasswordDto;
    switch (platform) {
      case AuthPlatform.GA:
        // Implement GA password change email logic here
        break;
      case AuthPlatform.PORTAL:
        const user = await this.checkEmailExistsPortal(email);
        if (!user) {
          throw new NotFoundException('Email não encontrado no portal.');
        }
        const payload = { sub: user.id, email: user.email };
        const resetToken = this.jwtService.sign(payload, { expiresIn: '10m'});
        const link = `http://example.com/reset-password?token=${resetToken}';`;
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
    const result = await this.dataSource.query(`SELECT
   *
FROM FK2_USERS u
WHERE u.EMAIL= :email`, [email]);
    return await toLowerCaseKeys(result[0]);
  }
  async updatePasswordPortal(codigo: number, hashedPassword: string): Promise<void> {
    await this.dataSource.query(`UPDATE FK2_USERS
    SET PASSWORD = :hashedPassword
    WHERE ID = :codigo`, [hashedPassword, codigo]);
  }
  async sendEmail(to: string, subject: string, htmlContent: string) {
    await this.mailerService.sendMail({
      to: to,
      subject: subject,
      html: htmlContent,
    });
  }
}
