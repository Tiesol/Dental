import { Injectable } from '@nestjs/common';

// Reloj inyectable: los services piden la hora aquí y no con new Date(), para que los tests puedan
// fijar "ahora" (regla del PDF: no ofrecer horarios anteriores a la fecha/hora actual).
@Injectable()
export class Clock {
  now(): Date {
    return new Date();
  }
}
