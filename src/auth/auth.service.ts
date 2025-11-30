import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { DataSource, Not } from 'typeorm';
import { AuthPlatform, SignInDto } from './dto/signIn.dto';
import { signUpDto } from './dto/signUp.dto';
import { HashService } from 'src/hash.service';
import { JwtService } from '@nestjs/jwt';
import { toLowerCaseKeys } from 'src/util/toLowerCaseKeys';


@Injectable()
export class AuthService {
  constructor(private readonly dataSource: DataSource, private hashService: HashService, private readonly jwtService: JwtService) { }
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
      throw new NotFoundException('Senha inválida');
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

  async validateUser(username: string, pass: string): Promise<any> {
    // Implement user validation logic here
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


}
