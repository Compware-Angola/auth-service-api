import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { UsersService } from './users.service';

import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUserDto } from './dto/update-user-student-data.dto';
import { LogAction } from 'src/common/decorators/log-action.decorator';

@Controller('studets')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Put(':userId/reset-password')
  @LogAction('RESET_STUDENT_PASSWORD', {
    module: 'UsersController',
    actionDescription: 'Redefinição de senha de estudante',
    targetResourceType: 'User',
  })
  @ApiOperation({
    summary: 'Redefine a senha do usuário usando o token enviado por e-mail',
  })
  @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso.' })
  @ApiParam({ name: 'userId', description: 'ID do estudante' })
  @ApiBody({ type: UpdatePasswordDto })
  async resetPassword(
    @Param('userId') userId: number,
    @Body() resetPasswordDto: UpdatePasswordDto,
  ) {
    return this.usersService.resetPassword(userId, resetPasswordDto);
  }

  @Put('users/:id')
  @LogAction('UPDATE_STUDENT_DATA', {
    module: 'UsersController',
    actionDescription: 'Atualização de dados do estudante',
    targetResourceType: 'User',
  })
  @ApiOperation({ summary: 'Atualiza os dados do usuário' })
  @ApiParam({ name: 'id', description: 'ID do usuário', example: 123 })
  @ApiBody({ type: UpdateUserDto })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const userId = Number(id);
    return this.usersService.updateDataUser(userId, updateUserDto);
  }
}
