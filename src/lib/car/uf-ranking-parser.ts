/**
 * Parser do arquivo de ranking nacional por UF.
 *
 * Formato aceito (o que o SICAR/planilha oficial usa):
 *   Coluna A = "UF" (código de 2 letras, ex.: PI, CE, SP)
 *   Coluna B = "Total do Tema" (ou variantes: "Total", "Análises Concluídas")
 *
 * Aceita XLSX (.xlsx/.xls) e CSV (`;` ou `,`). A linha "Total" no fim,
 * quando presente, é ignorada.
 */

import * as XLSX from "xlsx";

import { CarParseError } from "./types";

/** Códigos IBGE das 27 UFs — a validação garante que só entrem UFs reais. */
export const UF_CODES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
] as const;

export type UfCode = (typeof UF_CODES)[number];

export interface ParsedUfRankingRow {
  uf: UfCode;
  total: number;
}

export interface ParseUfRankingResult {
  rows: ParsedUfRankingRow[];
  /** Total do arquivo (para checagem opcional contra a linha "Total"). */
  soma: number;
  linhaTotalArquivo: number | null;
  /** UFs que não vieram no arquivo (para o aviso — não bloqueia). */
  ufsAusentes: UfCode[];
}

const UF_SET = new Set<string>(UF_CODES);

function isXlsx(buffer: Uint8Array): boolean {
  // XLSX = ZIP (assinatura PK\x03\x04). XLS legado = D0 CF 11 E0.
  return (
    (buffer[0] === 0x50 && buffer[1] === 0x4b) ||
    (buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0)
  );
}

function decodeCsv(buffer: Uint8Array): string {
  // BOM UTF-8?
  if (
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return new TextDecoder("utf-8").decode(buffer.subarray(3));
  }
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("windows-1252").decode(buffer);
}

function normalizeCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function parseTotal(raw: unknown, uf: string, linha: number): number {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0) {
      throw new CarParseError(
        "INVALID_HEADER",
        `Linha ${linha} (${uf}): valor de total inválido "${raw}".`,
      );
    }
    return Math.round(raw);
  }
  const s = normalizeCell(raw).replace(/\./g, "").replace(",", ".");
  if (s === "") return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) {
    throw new CarParseError(
      "INVALID_HEADER",
      `Linha ${linha} (${uf}): valor de total inválido "${raw}".`,
    );
  }
  return Math.round(n);
}

/** Parseia planilha e retorna matriz de linhas (arrays de strings/números). */
function toMatrix(buffer: Uint8Array): unknown[][] {
  if (isXlsx(buffer)) {
    // A xlsx library trata `Buffer` (Node) inconsistentemente com `type: "array"`.
    // Copia pro Uint8Array puro pra ela não usar métodos de Buffer que quebram o zip.
    const bytes =
      Buffer.isBuffer?.(buffer)
        ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength).slice()
        : buffer;
    const wb = XLSX.read(bytes, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      throw new CarParseError("EMPTY_FILE", "Planilha sem abas.");
    }
    const ws = wb.Sheets[sheetName];
    return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false });
  }
  // CSV — separador `;` (padrão SICAR) com fallback pra `,`.
  const text = decodeCsv(buffer);
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== "");
  const sep = (lines[0]?.includes(";") ?? false) ? ";" : ",";
  return lines.map((l) => l.split(sep).map((c) => c.trim()));
}

/**
 * Parse principal. Ignora a linha "Total" (case-insensitive) e devolve as
 * UFs em ordem alfabética. Não ordena por total — quem quiser ranking
 * ordenado faz `sort` no consumidor.
 */
export function parseUfRankingFile(
  input: Buffer | ArrayBuffer | Uint8Array,
): ParseUfRankingResult {
  const buffer: Uint8Array =
    input instanceof Uint8Array ? input : new Uint8Array(input);

  if (buffer.byteLength === 0) {
    throw new CarParseError("EMPTY_FILE", "Arquivo vazio.");
  }

  const matrix = toMatrix(buffer);
  if (matrix.length < 2) {
    throw new CarParseError(
      "EMPTY_FILE",
      "Arquivo precisa ter cabeçalho + pelo menos uma linha de dado.",
    );
  }

  // Sanity: cabeçalho tem que ter 2 colunas plausíveis.
  const header = matrix[0].map((c) => normalizeCell(c).toLowerCase());
  const temUf =
    header[0] === "uf" ||
    header[0] === "estado" ||
    header[0].startsWith("uf");
  if (!temUf) {
    throw new CarParseError(
      "MISSING_COLUMN",
      `Cabeçalho não reconhecido. Esperado "UF" na primeira coluna, encontrado "${matrix[0][0] ?? ""}".`,
      { header: matrix[0] },
    );
  }

  const rowsMap = new Map<UfCode, number>();
  let linhaTotalArquivo: number | null = null;
  let soma = 0;

  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length === 0) continue;
    const ufRaw = normalizeCell(row[0]).toUpperCase();
    if (ufRaw === "") continue;

    // Linha de total do próprio arquivo.
    if (ufRaw === "TOTAL" || ufRaw === "TOTAL GERAL") {
      linhaTotalArquivo = parseTotal(row[1], ufRaw, i + 1);
      continue;
    }

    if (!UF_SET.has(ufRaw)) {
      throw new CarParseError(
        "INVALID_HEADER",
        `Linha ${i + 1}: "${ufRaw}" não é uma UF válida do Brasil.`,
        { linha: i + 1, valor: ufRaw },
      );
    }

    const total = parseTotal(row[1], ufRaw, i + 1);
    // Dedup — se aparecer duas vezes, mantém a última (comportamento útil se
    // o operador edita a planilha e deixa uma linha órfã).
    rowsMap.set(ufRaw as UfCode, total);
  }

  if (rowsMap.size === 0) {
    throw new CarParseError(
      "EMPTY_FILE",
      "Nenhuma UF válida encontrada no arquivo.",
    );
  }

  const rows: ParsedUfRankingRow[] = Array.from(rowsMap.entries())
    .map(([uf, total]) => ({ uf, total }))
    .sort((a, b) => a.uf.localeCompare(b.uf));

  soma = rows.reduce((s, r) => s + r.total, 0);

  const ufsAusentes = UF_CODES.filter((u) => !rowsMap.has(u));

  return { rows, soma, linhaTotalArquivo, ufsAusentes };
}
