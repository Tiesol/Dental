export type Intervalo = { inicio: Date; fin: Date };

// Intervalos semiabiertos [inicio, fin): dos citas consecutivas no se solapan.
export function seSolapan(a: Intervalo, b: Intervalo): boolean {
  return a.inicio < b.fin && b.inicio < a.fin;
}
