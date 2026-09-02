import {
    BadRequestException,
    Injectable,
} from '@nestjs/common'
import { AuthTokenService } from './auth-token.service'
import { PeopleManagementAuthService } from '../strategies/people-management-auth.service'
import { AuthPlatform, SignInDto } from '../dto/signIn.dto'



@Injectable()
export class AuthService {
    constructor(
        private readonly authTokenService: AuthTokenService,
        private readonly peopleManagementAuthService: PeopleManagementAuthService,
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

    private async authenticate(
        platform: AuthPlatform,
        identifier: string,
        password: string,
    ) {
        switch (platform) {
            case AuthPlatform.PEOPLE_MANAGEMENT_PORTAL:
                return this.peopleManagementAuthService.authenticate(
                    identifier,
                    password,
                )

            default:
                throw new BadRequestException(
                    'Plataforma inválida',
                )
        }
    }
}