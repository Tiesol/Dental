// Tipos de dominio de la cita. No dependen de Prisma: el repository mapea las filas.

export type AppointmentStatus =
  'PENDIENTE' | 'CONFIRMADA' | 'EN_ATENCION' | 'FINALIZADA' | 'CANCELADA';

export type AppointmentView = {
  id: string;
  horaInicio: Date;
  horaFin: Date;
  estado: AppointmentStatus;
  createdAt: Date;
  servicio: { id: string; nombre: string; duracionMin: number };
  odontologo: { id: string; nombre: string; especialidad: string };
  paciente: { id: string; nombre: string; apellido: string; telefono: string | null };
  observacion: { texto: string; createdAt: Date } | null;
};

export type NewAppointment = {
  patientId: string;
  dentistId: string;
  serviceId: string;
  horaInicio: Date;
  horaFin: Date;
};

export type CuandoCitas = 'proximas' | 'historial';

export type AppointmentFilters = {
  rango?: { inicio: Date; fin: Date };
  estado?: AppointmentStatus;
  dentistId?: string;
  limit: number;
  offset: number;
};
