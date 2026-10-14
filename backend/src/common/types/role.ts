// Roles del sistema, con los valores exactos del PDF del docente.
// Se declara aquí (y no se importa de @prisma/client) para que el dominio y los
// decoradores no dependan del ORM. El enum Role de Prisma es estructuralmente compatible.
export const ROLES = ['PACIENTE', 'ODONTOLOGO', 'ADMIN'] as const;

export type Role = (typeof ROLES)[number];
