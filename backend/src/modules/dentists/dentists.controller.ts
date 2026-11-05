import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUserData } from '../../common/types/current-user';
import { ChangeDentistStatusDto } from './dto/change-dentist-status.dto';
import { CreateDentistDto } from './dto/create-dentist.dto';
import { ListDentistsQuery } from './dto/list-dentists.query';
import { SetDentistServicesDto } from './dto/set-dentist-services.dto';
import { UpdateDentistDto } from './dto/update-dentist.dto';
import { DentistsService } from './dentists.service';

@ApiTags('dentists')
@ApiBearerAuth()
@Controller('dentists')
export class DentistsController {
  constructor(private readonly dentistsService: DentistsService) {}

  @Get()
  @ApiOperation({
    summary: 'Odontólogos (ADMIN: todos; resto: solo los que aceptan citas). Filtro ?serviceId=',
  })
  findAll(@CurrentUser() user: CurrentUserData, @Query() query: ListDentistsQuery) {
    return this.dentistsService.findAll(user.role, query.serviceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un odontólogo (deshabilitado: solo ADMIN)' })
  findOne(@CurrentUser() user: CurrentUserData, @Param('id', ParseUUIDPipe) id: string) {
    return this.dentistsService.findOne(id, user.role);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Registra un odontólogo con su cuenta y servicios (solo ADMIN)' })
  create(@Body() dto: CreateDentistDto) {
    return this.dentistsService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Edita nombre y especialidad (solo ADMIN)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDentistDto) {
    return this.dentistsService.update(id, dto);
  }

  @Patch(':id/estado')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Habilita o deshabilita al profesional para nuevas citas (solo ADMIN)' })
  changeStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeDentistStatusDto) {
    return this.dentistsService.changeStatus(id, dto.activo);
  }

  @Put(':id/services')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reemplaza los servicios que realiza (solo ADMIN)' })
  setServices(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetDentistServicesDto) {
    return this.dentistsService.setServices(id, dto.serviceIds);
  }
}
