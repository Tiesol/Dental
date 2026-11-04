// Formatos de presentación compartidos.

// Moneda de los precios referenciales. El PDF no la fija; se usa bolivianos (Bs) por los teléfonos
// +591 del proyecto. Cambiar solo aquí si la clínica usa otra.
export const MONEDA = 'Bs';

// 30 -> "30 min", 60 -> "1 h", 90 -> "1 h 30 min"
export function formatearDuracion(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

// 150 -> "Bs 150,00"; null -> "Sin precio referencial"
export function formatearPrecio(precio: number | null): string {
  if (precio === null) return 'Sin precio referencial';
  return `${MONEDA} ${precio.toLocaleString('es', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
