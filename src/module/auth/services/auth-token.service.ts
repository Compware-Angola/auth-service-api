import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthPlatform } from '../dto/signIn.dto'

export interface PasswordResetTokenPayload {
    sub: number
    email: string
    platform: AuthPlatform
    type: 'password_reset'
}

@Injectable()
export class AuthTokenService {
    constructor(
        private readonly jwtService: JwtService,
    ) { }

    generateAccessToken(
        user: any,
        platform: AuthPlatform,
    ): string {
        const payload =
            this.createPayload(user, platform)

        return this.jwtService.sign(payload)
    }

    generatePasswordResetToken(
        user: any,
        platform: AuthPlatform,
    ): string {
        const payload: PasswordResetTokenPayload = {
            sub: user.id,
            email: user.email,
            platform,
            type: 'password_reset',
        }

        return this.jwtService.sign(payload, {
            expiresIn: '15m',
        })
    }

    verifyPasswordResetToken(
        token: string,
    ): PasswordResetTokenPayload {
        let payload: PasswordResetTokenPayload

        try {
            payload = this.jwtService.verify(token)
        } catch {
            throw new UnauthorizedException(
                'Token inválido ou expirado.',
            )
        }

        if (payload.type !== 'password_reset') {
            throw new UnauthorizedException(
                'Token inválido ou expirado.',
            )
        }

        return payload
    }

    private createPayload(
        user: any,
        platform: AuthPlatform,
    ) {
        switch (platform) {
            case AuthPlatform.PORTAL:
                return this.createAcademicPayload(user)

            case AuthPlatform.PEOPLE_MANAGEMENT_PORTAL:
                return this.createPeopleManagementPayload(user)

            default:
                throw new Error(
                    `Plataforma de autenticação não suportada: ${platform}`,
                )
        }
    }

    private createAcademicPayload(
        user: any,
    ) {
        return {
            sub: user.id,
            username: user.username,
            email: user.email,
            name: user.fullName,
            codigoPreinscricao: user.codigoPreinscricao,
            platform: AuthPlatform.PORTAL,
        }
    }

    private createPeopleManagementPayload(
        user: any,
    ) {
        return {
            sub: user.id,
            personId: user.personId,
            username: user.username,
            email: user.email,
            name: user.fullName,
            platform:
                AuthPlatform.PEOPLE_MANAGEMENT_PORTAL,
        }
    }




}