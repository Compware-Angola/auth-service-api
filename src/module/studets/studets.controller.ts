import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { StudetsService } from './studets.service';
import { CreateStudetDto } from './dto/create-studet.dto';
import { UpdateStudetDto } from './dto/update-studet.dto';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUserDto } from './dto/update-user-student-data.dto';

@Controller('studets')
export class StudetsController {
  constructor(private readonly studetsService: StudetsService) { }




  @Put(':userId/reset-password')
  @ApiOperation({ summary: 'Redefine a senha do usuário usando o token enviado por e-mail' })
  @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso.' })
  @ApiParam({ name: 'userId', description: 'ID do estudante' })
  @ApiBody({ type: UpdatePasswordDto })
  async resetPassword(
    @Param('userId') userId: number,
    @Body() resetPasswordDto: UpdatePasswordDto
  ) {
    return this.studetsService.resetPassword(userId, resetPasswordDto)
  }

   @Put('users/:id')
  @ApiOperation({ summary: 'Atualiza os dados do usuário' })
  @ApiParam({ name: 'id', description: 'ID do usuário', example: 123 })
  @ApiBody({ type: UpdateUserDto })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const userId = Number(id) 
    return this.studetsService.updateDataUser(userId, updateUserDto)
  }
}

