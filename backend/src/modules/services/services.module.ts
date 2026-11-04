import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesRepository } from './services.repository';
import { ServicesService } from './services.service';

// Catálogo de servicios dentales: gestión por el ADMIN y consulta para el resto.
// Exporta solo el service (lo usarán dentists y appointments).
@Module({
  controllers: [ServicesController],
  providers: [ServicesService, ServicesRepository],
  exports: [ServicesService],
})
export class ServicesModule {}
