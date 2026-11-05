import { Module } from '@nestjs/common';
import { Clock } from '../../common/time/clock';

// Disponibilidad de los odontólogos: horarios de atención y bloques no disponibles.
@Module({ providers: [Clock] })
export class AvailabilityModule {}
