import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUserData } from '../../common/types/current-user';
import { AvailabilityService } from './availability.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';

@ApiTags('availability')
@ApiBearerAuth()
@Controller('dentists/:id')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('availability')
  @ApiOperation({ summary: 'Horarios de atención y bloques que aún no terminan' })
  find(@CurrentUser() user: CurrentUserData, @Param('id', ParseUUIDPipe) id: string) {
    return this.availabilityService.find(id, user.role);
  }

  @Put('availability')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reemplaza todos los horarios de atención (solo ADMIN)' })
  replaceHorarios(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetAvailabilityDto) {
    return this.availabilityService.replaceHorarios(id, dto.horarios);
  }
}
