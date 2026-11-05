import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUserData } from '../../common/types/current-user';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQuery } from './dto/list-appointments.query';
import { ListMyAppointmentsQuery } from './dto/list-my-appointments.query';

@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles('PACIENTE')
  @ApiOperation({ summary: 'Reserva una cita (solo PACIENTE)' })
  create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.reservar(dto, user.patientId!);
  }

  // Declarada antes que :id para que "mine" no se interprete como un id.
  @Get('mine')
  @Roles('PACIENTE')
  @ApiOperation({ summary: 'Mis citas: próximas, historial o todas (solo PACIENTE)' })
  findMine(@CurrentUser() user: CurrentUserData, @Query() query: ListMyAppointmentsQuery) {
    return this.appointmentsService.findMine(user.patientId!, query.cuando);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Todas las citas, con filtros (solo ADMIN)' })
  findAll(@Query() query: ListAppointmentsQuery) {
    return this.appointmentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una cita (paciente dueño, odontólogo asignado o ADMIN)' })
  findOne(@CurrentUser() user: CurrentUserData, @Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.findOne(id, user);
  }
}
