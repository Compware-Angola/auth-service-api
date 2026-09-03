import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'

import { HashService } from 'src/app.service'

@Injectable()
export class PeopleManagementAuthService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly hashService: HashService,
    ) { }

    async authenticate(
        identifier: string,
        password: string,
    ) {
        const user = await this.findUser(identifier)

        if (!user) {
            throw new UnauthorizedException(
                'Credenciais inválidas',
            )
        }

        const validPassword =
            await this.hashService.verificarHash(
                password,
                user.password,
            )

        if (!validPassword) {
            throw new UnauthorizedException(
                'Credenciais inválidas',
            )
        }

        return user
    }

    async findByEmail(email: string) {
        const value = email.trim().toLowerCase()

        const result =
            await this.dataSource.query(
                `
        SELECT
          U.CODIGO AS "id",
          U.CODIGO_PESSOA AS "personId",
          U.EMAIL AS "email",
          U.USERNAME AS "username",

          P.NOME AS "fullName"

        FROM GP_USER_COLABORADOR U

        INNER JOIN GP_PESSOA P
          ON P.CODIGO = U.CODIGO_PESSOA

        WHERE LOWER(U.EMAIL) = :email

        FETCH FIRST 1 ROW ONLY
      `,
                [value],
            )

        return result[0] ?? null
    }

    async updatePassword(
        userId: number,
        newPassword: string,
    ): Promise<void> {
        const hashedPassword =
            await this.hashService.criarHash(newPassword)

        await this.dataSource.query(
            `
        UPDATE GP_USER_COLABORADOR
        SET SENHA = :hashedPassword
        WHERE CODIGO = :userId
      `,
            [hashedPassword, userId],
        )
    }

    private async findUser(
        identifier: string,
    ) {
        const value = identifier.trim().toLowerCase()

        const result =
            await this.dataSource.query(
                `
        SELECT
          U.CODIGO AS "id",
          U.CODIGO_PESSOA AS "personId",
          U.EMAIL AS "email",
          U.USERNAME AS "username",
          U.SENHA AS "password",

          P.NOME AS "fullName",
          P.STATUS AS "status"

        FROM GP_USER_COLABORADOR U

        INNER JOIN GP_PESSOA P
          ON P.CODIGO = U.CODIGO_PESSOA

        WHERE
          LOWER(U.EMAIL) = :identifierEmail
          OR LOWER(U.USERNAME) = :identifierUsername

        FETCH FIRST 1 ROW ONLY
      `,
                [value, value],
            )

        return result[0] ?? null
    }
}