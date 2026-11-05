// Tipos de dominio de la disponibilidad. No dependen de Prisma: el repository mapea las filas.

// Tramo semanal de atención, en minutos desde las 00:00 en la zona de la clínica (09:00 = 540).
// diaSemana: 0 = domingo ... 6 = sábado. Un horario partido son dos tramos.
export type AvailabilityRuleInput = {
  diaSemana: number;
  minutoInicio: number;
  minutoFin: number;
};

export type AvailabilityRuleRecord = AvailabilityRuleInput & { id: string };

export type BlockRange = { inicio: Date; fin: Date };

export type NewUnavailableBlock = BlockRange & { motivo: string | null };

export type UnavailableBlockRecord = NewUnavailableBlock & { id: string };

export type AvailabilityView = {
  horarios: AvailabilityRuleRecord[];
  bloques: UnavailableBlockRecord[];
};

// Lo que ven PACIENTE y ODONTOLOGO: cuándo no se atiende, sin el motivo.
export type PublicAvailabilityView = {
  horarios: AvailabilityRuleRecord[];
  bloques: (BlockRange & { id: string })[];
};
