import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthPlatform } from '../dto/signIn.dto'

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

    private createPayload(
        user: any,
        platform: AuthPlatform,
    ) {
        switch (platform) {
            case AuthPlatform.PEOPLE_MANAGEMENT_PORTAL:
                return this.createPeopleManagementPayload(user)

            default:
                throw new Error(
                    `Plataforma de autenticação não suportada: ${platform}`,
                )
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