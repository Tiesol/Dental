// Texto que se escribe en los campos de fecha y hora. Los valores viajan como "yyyy-MM-dd" y "HH:mm"
// (hora de la clínica); en pantalla la fecha se muestra como "dd/mm/aaaa".

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const TEXTO_FECHA = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const TEXTO_HORA = /^(\d{1,2}):(\d{2})$/;

const dosDigitos = (n: number) => String(n).padStart(2, '0');

function esFechaReal(anio: number, mes: number, dia: number): boolean {
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
}

// "2026-11-10" -> "10/11/2026"
export function isoATextoFecha(iso: string): string {
  const partes = ISO.exec(iso);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : '';
}

// Acepta "dd/mm/aaaa" y también "aaaa-mm-dd" (lo que llega al pegar). Devuelve el ISO o null.
export function textoFechaAIso(texto: string): string | null {
  const limpio = texto.trim();
  const iso = ISO.exec(limpio);
  const local = TEXTO_FECHA.exec(limpio);
  const [anio, mes, dia] = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : local
      ? [Number(local[3]), Number(local[2]), Number(local[1])]
      : [0, 0, 0];
  if (!anio || !esFechaReal(anio, mes, dia)) return null;
  return `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`;
}

// Inserta las barras mientras se escriben los dígitos: "10112026" -> "10/11/2026".
export function enmascararFecha(texto: string): string {
  if (ISO.test(texto.trim())) return texto.trim();
  const digitos = texto.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

// "9:5" no es válida; "9:05" -> "09:05". Devuelve "HH:mm" o null.
export function textoHoraAValor(texto: string): string | null {
  const partes = TEXTO_HORA.exec(texto.trim());
  if (!partes) return null;
  const horas = Number(partes[1]);
  const minutos = Number(partes[2]);
  if (horas > 23 || minutos > 59) return null;
  return `${dosDigitos(horas)}:${dosDigitos(minutos)}`;
}

// Inserta los dos puntos mientras se escriben los dígitos: "0930" -> "09:30".
export function enmascararHora(texto: string): string {
  if (TEXTO_HORA.test(texto.trim())) return texto.trim();
  const digitos = texto.replace(/\D/g, '').slice(0, 4);
  if (digitos.length <= 2) return digitos;
  return `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
}

// Horas sugeridas cada `paso` minutos: "00:00", "00:15", ...
export function horasDelDia(paso: number): string[] {
  const horas: string[] = [];
  for (let minuto = 0; minuto < 24 * 60; minuto += paso) {
    horas.push(`${dosDigitos(Math.floor(minuto / 60))}:${dosDigitos(minuto % 60)}`);
  }
  return horas;
}
