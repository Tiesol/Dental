import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUserData } from '../../common/types/current-user';
import { AvailabilityService } from './availability.service';
import { CreateBlockDto } from './dto/create-block.dto';
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

  @Post('blocks')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crea un bloque no disponible (solo ADMIN)' })
  createBlock(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateBlockDto) {
    return this.availabilityService.createBlock(id, dto);
  }

  @Delete('blocks/:blockId')
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({ summary: 'Borra un bloque no disponible (solo ADMIN)' })
  deleteBlock(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('blockId', ParseUUIDPipe) blockId: string,
  ) {
    return this.availabilityService.deleteBlock(id, blockId);
  }
}
