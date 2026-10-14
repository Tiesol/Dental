// El email es la identidad del usuario: se guarda y se compara siempre normalizado.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
