// Tipos de dominio del servicio dental. No dependen de Prisma: el repository mapea las filas.
// precioReferencial es opcional (PDF sección 3); se expone como número con hasta 2 decimales.

export type ServiceRecord = {
  id: string;
  nombre: string;
  descripcion: string;
  duracionMin: number;
  precioReferencial: number | null;
  activo: boolean;
};

export type NewService = {
  nombre: string;
  descripcion: string;
  duracionMin: number;
  precioReferencial: number | null;
  activo: boolean;
};

export type ServiceChanges = Partial<Omit<NewService, 'activo'>>;
