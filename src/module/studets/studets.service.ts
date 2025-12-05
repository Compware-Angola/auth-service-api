import { BadGatewayException, Injectable } from '@nestjs/common';
import { HashService } from 'src/hash.service';
import { DataSource } from 'typeorm';
import { UpdatePasswordDto } from './dto/update-password.dto';


@Injectable()
export class StudetsService {
  constructor(private readonly dataSource: DataSource, private hashService: HashService) { }



  async resetPassword(UserId: number, updatePasswordDto: UpdatePasswordDto) {
    const { confirmPassword, newPassword } = updatePasswordDto

    if (confirmPassword != newPassword) {

      throw new BadGatewayException("As Senhas Não coincidem !");

    }
    const hashedPassword = await this.hashService.criarHash(newPassword);
    await this.updatePasswordPortal(Number(UserId), hashedPassword);

    return { message: 'Senha redefinida com sucesso no portal.' };
  }

  async updatePasswordPortal(codigo: number, hashedPassword: string): Promise<void> {
    await this.dataSource.query(`UPDATE FK2_USERS
    SET PASSWORD = :hashedPassword
    WHERE ID = :codigo`, [hashedPassword, codigo]);
  }
}
