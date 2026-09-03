import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common'
import { AuthTokenService } from './auth-token.service'
import { PeopleManagementAuthService } from '../strategies/people-management-auth.service'
import { AcademicAuthService } from '../strategies/academic-auth.service'
import { AuthPlatform, SignInDto } from '../dto/signIn.dto'
import { CheckEmailExistsDto } from '../dto/check-email-exists'
import { ResetPasswordDto } from '../dto/reset-password'
import { MailService } from '../../shared/mailer/mail.service'

type AuthStrategy = AcademicAuthService | PeopleManagementAuthService

interface PasswordResetConfig {
    urlBase: string
    resetPath: string
    subject: string
}

@Injectable()
export class AuthService {
    constructor(
        private readonly authTokenService: AuthTokenService,
        private readonly academicAuthService: AcademicAuthService,
        private readonly peopleManagementAuthService: PeopleManagementAuthService,
        private readonly mailService: MailService,
    ) { }

    async signIn(
        dto: SignInDto,

    ) {
        const {
            username: identifier,
            password,
            platform,
        } = dto

        const user = await this.authenticate(
            platform,
            identifier,
            password,
        )

        const token =
            this.authTokenService.generateAccessToken(
                user,
                platform,
            )

        const {
            password: _password,
            ...userWithoutPassword
        } = user

        return {
            token,
            user: userWithoutPassword,
        }
    }

    async logout(platform: AuthPlatform) {
        this.resolveStrategy(platform)

        // Autenticação stateless (JWT): não existe sessão no servidor
        // para invalidar. O cliente deve descartar o token.
        return {
            message: 'Sessão terminada com sucesso',
        }
    }

    async requestPasswordReset(dto: CheckEmailExistsDto) {
        const { email, platform } = dto

        const strategy = this.resolveStrategy(platform)
        const user = await strategy.findByEmail(email)

        if (!user) {
            throw new NotFoundException('E-mail não encontrado')
        }

        const token =
            this.authTokenService.generatePasswordResetToken(
                user,
                platform,
            )

        const { urlBase, resetPath, subject } =
            this.getPasswordResetConfig(platform)

        const resetLink = `${urlBase}${resetPath}/${token}`

        await this.mailService.send({
            to: user.email,
            subject,
            html: this.buildPasswordResetEmail(resetLink),
        })

        return {
            message:
                'E-mail de redefinição de senha enviado com sucesso',
        }
    }

    async resetPassword(dto: ResetPasswordDto) {
        const { token, newPassword, platform } = dto

        const payload =
            this.authTokenService.verifyPasswordResetToken(token)

        if (payload.platform !== platform) {
            throw new BadRequestException(
                'Token não corresponde à plataforma informada.',
            )
        }

        const strategy = this.resolveStrategy(platform)
        const user = await strategy.findByEmail(payload.email)

        if (!user) {
            throw new NotFoundException('Utilizador não encontrado')
        }

        await strategy.updatePassword(user.id, newPassword)

        return {
            message: 'Senha redefinida com sucesso',
        }
    }

    private async authenticate(
        platform: AuthPlatform,
        identifier: string,
        password: string,
    ) {
        return this.resolveStrategy(platform).authenticate(
            identifier,
            password,
        )
    }

    private resolveStrategy(
        platform: AuthPlatform,
    ): AuthStrategy {
        switch (platform) {
            case AuthPlatform.PORTAL:
                return this.academicAuthService

            case AuthPlatform.PEOPLE_MANAGEMENT_PORTAL:
                return this.peopleManagementAuthService

            default:
                throw new BadRequestException(
                    'Plataforma inválida',
                )
        }
    }

    private getPasswordResetConfig(
        platform: AuthPlatform,
    ): PasswordResetConfig {
        switch (platform) {
            case AuthPlatform.PORTAL:
                return {
                    urlBase:
                        process.env.URL_PORTAL ||
                        'http://localhost:3001',
                    resetPath: '/auth/renovar-senha',
                    subject:
                        'Redefinição de Senha - Portal Académico',
                }

            case AuthPlatform.PEOPLE_MANAGEMENT_PORTAL:
                return {
                    urlBase:
                        process.env.URL_PEOPLE_MANAGEMENT_PORTAL ||
                        'http://localhost:3001',
                    resetPath: '/reset-password',
                    subject:
                        'Redefinição de Senha - Portal de Candidatura',
                }

            default:
                throw new BadRequestException(
                    'Plataforma inválida',
                )
        }
    }

    private buildPasswordResetEmail(
        resetLink: string,
    ): string {
        return `
    <p>Olá,</p>
    <p>Recebemos um pedido para redefinir a sua senha.</p>
    <p>Clique no link abaixo para prosseguir (válido por 15 minutos):</p>
    <p><a href="${resetLink}">${resetLink}</a></p>
    <p>Se não solicitou esta ação, ignore este email.</p>
    <p>Atenciosamente,<br>Equipa do Sistema Académico</p>
  `
    }
}
