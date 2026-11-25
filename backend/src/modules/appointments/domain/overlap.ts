export type Interval = { inicio: Date; fin: Date };

// Intervalos semiabiertos [inicio, fin): dos citas consecutivas no se solapan.
export function overlaps(a: Interval, b: Interval): boolean {
  return a.inicio < b.fin && b.inicio < a.fin;
}
