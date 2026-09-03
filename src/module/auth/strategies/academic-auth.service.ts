import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'

import { HashService } from 'src/app.service'

@Injectable()
export class AcademicAuthService {
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
          U.ID AS "id",
          U.USERNAME AS "username",
          U.EMAIL AS "email",
          U.NAME AS "fullName"

        FROM FK2_USERS U

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
        UPDATE FK2_USERS
        SET PASSWORD = :hashedPassword,
            PASSWORD_RESET_REQUIRED = 0
        WHERE ID = :userId
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
          U.ID AS "id",
          U.USERNAME AS "username",
          U.EMAIL AS "email",
          U.NAME AS "fullName",
          U.PASSWORD AS "password",
          U.NUMERO_DOCUMENTO AS "documentNumber",
          U.ESTADO AS "status",

          P.CODIGO AS "codigoPreinscricao",
          P.NOME_COMPLETO AS "fullNamePreinscricao"

        FROM FK2_USERS U

        LEFT JOIN FK2_TB_PREINSCRICAO P
          ON P.USER_ID = U.ID

        WHERE
          LOWER(U.USERNAME) = :identifierUsername
          OR LOWER(U.EMAIL) = :identifierEmail
          OR LOWER(U.NUMERO_DOCUMENTO) = :identifierDocument
          OR LOWER(P.BILHETE_IDENTIDADE) = :identifierBi

        FETCH FIRST 1 ROW ONLY
      `,
                [value, value, value, value],
            )

        return result[0] ?? null
    }
}
