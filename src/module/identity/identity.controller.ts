import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateIdentityResult, IdentityService } from './identity.service';
import { CreateIdentityDto } from './dto/create-identity.dto';
import { UpdateIdentityDto } from './dto/update-identity.dto';
import { FindAllIdentitiesDto } from './dto/find-all.dto';

@ApiTags('IDENTITY')
@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) { }

  @Post()
  @ApiOperation({ summary: 'Cria uma nova identidade' })
  @ApiBody({ type: CreateIdentityDto })
  @ApiResponse({ status: 201, description: 'Identidade criada com sucesso.' })
  create(@Body() dto: CreateIdentityDto): Promise<CreateIdentityResult> {
    return this.identityService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista todas as identidades' })
  findAll(@Query() query: FindAllIdentitiesDto) {
    return this.identityService.findAll(query);
  }

  @Get('username/:username')
  @ApiOperation({ summary: 'Consulta uma identidade pelo username' })
  @ApiParam({ name: 'username' })
  findByUsername(@Param('username') username: string) {
    return this.identityService.findByUsername(username);
  }

  @Get('email/:email')
  @ApiOperation({ summary: 'Consulta uma identidade pelo email' })
  @ApiParam({ name: 'email' })
  findByEmail(@Param('email') email: string) {
    return this.identityService.findByEmail(email);
  }

  @Get(':id/exists')
  @ApiOperation({ summary: 'Verifica se uma identidade existe' })
  @ApiParam({ name: 'id' })
  async exists(@Param('id') id: string) {
    return { exists: await this.identityService.exists(Number(id)) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta uma identidade pelo ID' })
  @ApiParam({ name: 'id' })
  findById(@Param('id') id: string) {
    return this.identityService.findById(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza os dados de uma identidade' })
  @ApiBody({ type: UpdateIdentityDto })
  update(@Param('id') id: string, @Body() dto: UpdateIdentityDto) {
    return this.identityService.update(Number(id), dto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Ativa uma identidade' })
  activate(@Param('id') id: string) {
    return this.identityService.setActive(Number(id), true);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desativa uma identidade' })
  deactivate(@Param('id') id: string) {
    return this.identityService.setActive(Number(id), false);
  }
}
