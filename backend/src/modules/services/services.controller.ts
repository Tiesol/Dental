import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUserData } from '../../common/types/current-user';
import { ChangeServiceStatusDto } from './dto/change-service-status.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@ApiTags('services')
@ApiBearerAuth()
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo de servicios (ADMIN: todos; resto: solo habilitados)' })
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.servicesService.findAll(user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un servicio (deshabilitado: solo ADMIN)' })
  findOne(@CurrentUser() user: CurrentUserData, @Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.findOne(id, user.role);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crea un servicio (solo ADMIN)' })
  create(@Body() dto: CreateServiceDto) {
    return this.servicesService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Edita nombre, descripción, duración o precio (solo ADMIN)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.update(id, dto);
  }

  @Patch(':id/estado')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Habilita o deshabilita un servicio (solo ADMIN)' })
  changeStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeServiceStatusDto) {
    return this.servicesService.changeStatus(id, dto.activo);
  }
}
