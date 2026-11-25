// Formatos de presentación compartidos.

// Moneda de los precios referenciales. El PDF no la fija; se usa bolivianos (Bs) por los teléfonos
// +591 del proyecto. Cambiar solo aquí si la clínica usa otra.
export const CURRENCY = 'Bs';

// 30 -> "30 min", 60 -> "1 h", 90 -> "1 h 30 min"
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

// 150 -> "Bs 150,00"; null -> "Sin precio referencial"
export function formatPrice(price: number | null): string {
  if (price === null) return 'Sin precio referencial';
  return `${CURRENCY} ${price.toLocaleString('es', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// "Ana María Pérez" -> "AP", "Dr. Juan Rojas" -> "JR", "Administrador" -> "A"
export function initials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((p) => p !== '' && !/^dra?\.$/i.test(p));
  if (words.length === 0) return '?';
  const [first] = words;
  const last = words[words.length - 1];
  const letters = words.length === 1 ? first[0] : first[0] + last[0];
  return letters.toUpperCase();
}
