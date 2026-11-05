import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CreateE2eAppointmentDto } from './dto/create-e2e-appointment.dto';
import { E2eOnlyGuard } from './e2e-only.guard';
import { E2eService } from './e2e.service';

@ApiExcludeController()
@Public()
@UseGuards(E2eOnlyGuard)
@Controller('e2e')
export class E2eController {
  constructor(private readonly e2eService: E2eService) {}

  @Post('seed')
  sembrar() {
    return this.e2eService.sembrar();
  }

  @Post('citas')
  crearCita(@Body() dto: CreateE2eAppointmentDto) {
    return this.e2eService.crearCita(dto);
  }
}
