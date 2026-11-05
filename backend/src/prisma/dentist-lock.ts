import { Tx } from './prisma.service';

// Serializa todo lo que cambia la agenda de un odontólogo: reservas, reprogramaciones, bloques y
// horarios (ARQUITECTURA.md sección 5). Sin este bloqueo, un bloque podría crearse mientras se
// confirma una cita que choca con él, y dos PUT simultáneos terminarían en deadlock o violando
// availability_no_overlap.
export async function lockDentist(tx: Tx, dentistId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Dentist" WHERE id = ${dentistId} FOR UPDATE`;
}
