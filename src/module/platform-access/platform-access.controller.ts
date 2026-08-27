import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PlatformAccessService } from './platform-access.service';
import { CreatePlatformAccessDto } from './dto/create-platform-access.dto';
import { CheckPlatformAccessDto } from './dto/check-platform-access.dto';

@ApiTags('PLATFORM-ACCESS')
@Controller('platform-access')
export class PlatformAccessController {
  constructor(
    private readonly platformAccessService: PlatformAccessService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Concede acesso de um utilizador a uma plataforma' })
  @ApiBody({ type: CreatePlatformAccessDto })
  @ApiResponse({ status: 201, description: 'Acesso concedido com sucesso.' })
  create(@Body() dto: CreatePlatformAccessDto) {
    return this.platformAccessService.grantAccess(dto);
  }

  @Get('check')
  @ApiOperation({
    summary: 'Verifica se um utilizador tem acesso a uma plataforma',
  })
  @ApiQuery({ name: 'userId', example: 123 })
  @ApiQuery({ name: 'platformCode', example: 'INVOICE' })
  @ApiResponse({ status: 200, description: 'Resultado da verificação.' })
  async check(@Query() query: CheckPlatformAccessDto) {
    const hasAccess = await this.platformAccessService.hasAccess(
      query.userId,
      query.platformCode,
    );
    return { hasAccess };
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Lista as plataformas a que um utilizador tem acesso',
  })
  @ApiParam({ name: 'userId' })
  findByUser(@Param('userId') userId: string) {
    return this.platformAccessService.findByUser(Number(userId));
  }

  @Get('platform/:platformId')
  @ApiOperation({ summary: 'Lista os utilizadores com acesso a uma plataforma' })
  @ApiParam({ name: 'platformId' })
  findByPlatform(@Param('platformId') platformId: string) {
    return this.platformAccessService.findByPlatform(Number(platformId));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoga o acesso de um utilizador a uma plataforma' })
  @ApiParam({ name: 'id' })
  remove(@Param('id') id: string) {
    return this.platformAccessService.revokeAccess(Number(id));
  }
}
