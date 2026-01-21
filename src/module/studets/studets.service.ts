import { BadGatewayException, Injectable } from '@nestjs/common';
import { HashService } from 'src/app.service';
import { DataSource } from 'typeorm';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUserDto } from './dto/update-user-student-data.dto';


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



async updateDataUser(codigo: number, data: UpdateUserDto): Promise<any> {
  const fields: string[] = []
  const params: any[] = []

  if (data.name !== undefined) {
    fields.push('NAME = :name')
    params.push(data.name)
  }
  if (data.telefone !== undefined) {
    fields.push('TELEFONE = :telefone')
    params.push(data.telefone)
  }
  if (data.email !== undefined) {
    fields.push('EMAIL = :email')
    params.push(data.email)
  }

  if (fields.length === 0) return

  params.push(codigo)

  const sql = `UPDATE FK2_USERS SET ${fields.join(', ')} WHERE ID = :codigo`
  await this.dataSource.query(sql, params)
   return { message: 'Dados Atualizados com sucesso.' };
}


}
