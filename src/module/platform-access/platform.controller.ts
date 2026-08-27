import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PlatformService } from './platform.service';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';

@ApiTags('PLATFORMS')
@Controller('platforms')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Post()
  @ApiOperation({ summary: 'Cria uma nova plataforma' })
  @ApiBody({ type: CreatePlatformDto })
  @ApiResponse({ status: 201, description: 'Plataforma criada com sucesso.' })
  create(@Body() dto: CreatePlatformDto) {
    return this.platformService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista todas as plataformas' })
  findAll() {
    return this.platformService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta uma plataforma pelo ID' })
  @ApiParam({ name: 'id' })
  findById(@Param('id') id: string) {
    return this.platformService.findById(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma plataforma' })
  @ApiBody({ type: UpdatePlatformDto })
  update(@Param('id') id: string, @Body() dto: UpdatePlatformDto) {
    return this.platformService.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove uma plataforma' })
  remove(@Param('id') id: string) {
    return this.platformService.remove(Number(id));
  }
}
