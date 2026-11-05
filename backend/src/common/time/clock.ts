import { Injectable } from '@nestjs/common';

// Reloj inyectable: los services piden la hora aquí y no con new Date(), para que los tests puedan
// fijar "ahora" (regla del PDF: no ofrecer horarios anteriores a la fecha/hora actual).
@Injectable()
export class Clock {
  // CLOCK_NOW solo se respeta en modo test: los E2E necesitan que los horarios existan siempre y
  // no caigan en el pasado.
  now(): Date {
    const fija = process.env.NODE_ENV === 'test' ? process.env.CLOCK_NOW : undefined;
    return fija ? new Date(fija) : new Date();
  }
}
