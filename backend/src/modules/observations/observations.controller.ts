import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUserData } from '../../common/types/current-user';
import { CreateObservationDto } from './dto/create-observation.dto';
import { ObservationsService } from './observations.service';

@ApiTags('observations')
@ApiBearerAuth()
@Controller('appointments/:id/observation')
export class ObservationsController {
  constructor(private readonly observationsService: ObservationsService) {}

  @Post()
  @Roles('ODONTOLOGO')
  @ApiOperation({ summary: 'Registra la observación de atención (odontólogo asignado)' })
  create(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateObservationDto,
  ) {
    return this.observationsService.registrar(id, dto.texto, user);
  }
}
