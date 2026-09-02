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