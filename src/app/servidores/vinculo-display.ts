/**
 * Rótulos de display exclusivos da página /servidores.
 * O valor no banco continua "Consultor PSI"/"Consultor Pilares II" —
 * aqui só renomeamos como aparece na UI.
 */
const VINCULO_DISPLAY: Record<string, string> = {
  "Consultor PSI": "Projeto PSI",
  "Consultor Pilares II": "Projeto Pilares II",
};

export function displayVinculo(v: string): string {
  return VINCULO_DISPLAY[v] ?? v;
}

/**
 * Aniversário — retorna o número de dias até o próximo aniversário
 * (0 = hoje). null se a data for inválida ou vazia.
 */
export function daysUntilBirthday(
  dataNascimento: string | null | undefined,
  today: Date = new Date(),
): number | null {
  if (!dataNascimento) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataNascimento);
  if (!match) return null;
  const [, , mm, dd] = match;
  const month = Number(mm) - 1;
  const day = Number(dd);
  if (Number.isNaN(month) || Number.isNaN(day)) return null;

  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(t.getFullYear(), month, day);
  if (next < t) {
    next = new Date(t.getFullYear() + 1, month, day);
  }
  const diffMs = next.getTime() - t.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
