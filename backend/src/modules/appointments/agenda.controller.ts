import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUserData } from '../../common/types/current-user';
import { AppointmentsService } from './appointments.service';
import { AgendaQuery, UpcomingAgendaQuery } from './dto/agenda.query';

// El odontólogo sale siempre del token: no hay parámetro que permita pedir otra agenda (PDF 9).
@ApiTags('agenda')
@ApiBearerAuth()
@Roles('ODONTOLOGO')
@Controller('dentists/me/agenda')
export class AgendaController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Mis citas de un día, hoy por defecto (solo ODONTOLOGO)' })
  findDay(@CurrentUser() user: CurrentUserData, @Query() query: AgendaQuery) {
    return this.appointmentsService.agendaDelDia(user.dentistId!, query.fecha);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Mis próximas citas (solo ODONTOLOGO)' })
  findUpcoming(@CurrentUser() user: CurrentUserData, @Query() query: UpcomingAgendaQuery) {
    return this.appointmentsService.proximasDelOdontologo(user.dentistId!, query.limit);
  }
}
