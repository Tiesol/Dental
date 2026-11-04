// Tipos de dominio del odontólogo. No dependen de Prisma: el repository mapea las filas.

export type DentistServiceSummary = {
  id: string;
  nombre: string;
  duracionMin: number;
  activo: boolean;
};

export type DentistRecord = {
  id: string;
  userId: string;
  email: string;
  // Cuenta de usuario habilitada (puede iniciar sesión). Distinto de `activo`.
  cuentaActiva: boolean;
  nombre: string;
  especialidad: string;
  // Profesional habilitado: acepta nuevas citas (PDF sección 4).
  activo: boolean;
  servicios: DentistServiceSummary[];
};

// Lo que ven PACIENTE y ODONTOLOGO: sin datos de la cuenta y solo servicios habilitados.
export type DentistPublicView = {
  id: string;
  nombre: string;
  especialidad: string;
  servicios: { id: string; nombre: string; duracionMin: number }[];
};

export type DentistChanges = { nombre?: string; especialidad?: string };
