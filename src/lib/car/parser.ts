/**
 * Parser do CSV do SICAR-PI (`Relatorio-Buscar-Imoveis.csv`).
 *
 * Cenário real observado:
 *   - Encoding CP1252 (algumas exportações podem vir em UTF-8; detectamos)
 *   - Separador `;`
 *   - 4 colunas obrigatórias: Número do Recibo, Município, Situação do Imóvel,
 *     Fase do Processo (mais uma coluna vazia no fim, típica do SICAR)
 *   - ~334k linhas de dados (arquivo ~40 MB decodificado)
 *
 * Pré-flight de colunas: **Município é bloqueante** — se ausente, joga
 * CarParseError('MISSING_COLUMN') antes de qualquer parse de linha.
 */

import {
  CAR_SITUACOES,
  CarParseError,
  type CarSituacao,
  type ParsedCarRow,
} from "./types";

/** Colunas obrigatórias — chave interna → variantes de cabeçalho aceitas. */
const REQUIRED_COLUMNS = {
  numeroRecibo: ["numero do recibo"],
  municipio: ["municipio"],
  situacao: ["situacao do imovel"],
  faseOriginal: ["fase do processo"],
} as const satisfies Record<keyof Omit<ParsedCarRow, "linha">, readonly string[]>;

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_ROWS = 1_000_000;

export interface ParseCarCsvResult {
  rows: ParsedCarRow[];
  totalLinhas: number;
  encoding: "utf-8" | "windows-1252";
  /** Cabeçalho original, na ordem em que veio no arquivo. */
  header: string[];
  /** Linhas descartadas por serem vazias ou terem menos colunas que o esperado. */
  linhasDescartadas: number;
}

/**
 * Normaliza uma string de cabeçalho para comparação:
 *   - Remove acentos (NFD + strip diacritics)
 *   - Colapsa espaços múltiplos, trim
 *   - Minúsculas
 */
export function normalizeHeader(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Detecta encoding do buffer testando o cabeçalho.
 * SICAR-PI exporta em CP1252, mas algumas variantes vêm em UTF-8.
 */
function detectEncoding(buffer: Uint8Array): "utf-8" | "windows-1252" {
  const head = buffer.subarray(0, Math.min(2048, buffer.length));
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(head);
  // Se o header contém caracteres portugueses válidos em UTF-8, é UTF-8.
  if (/Munic[ií]pio|Situa[çc][ãa]o|N[úu]mero/i.test(utf8) && !utf8.includes("�")) {
    return "utf-8";
  }
  return "windows-1252";
}

/**
 * Parseia uma linha CSV com separador `;`, respeitando aspas duplas.
 * Formato: `a;b;"c;com;ponto-e-vírgula";d` → ['a','b','c;com;ponto-e-vírgula','d']
 * Aspas duplas dentro de campo aspado são escapadas como `""`.
 */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ";") {
        out.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}

/**
 * Mapeia o cabeçalho lido → índice de cada coluna obrigatória.
 * Bloqueia se qualquer coluna obrigatória estiver ausente.
 */
function mapColumns(
  header: string[],
): Record<keyof typeof REQUIRED_COLUMNS, number> {
  const normalized = header.map(normalizeHeader);
  const missing: string[] = [];
  const idx = {} as Record<keyof typeof REQUIRED_COLUMNS, number>;

  for (const [key, variants] of Object.entries(REQUIRED_COLUMNS)) {
    const found = normalized.findIndex((h) =>
      (variants as readonly string[]).some((v) => h === v || h.includes(v)),
    );
    if (found === -1) {
      // Rótulo humano da coluna (usa a 1ª variante formatada).
      const humano =
        key === "numeroRecibo" ? "Número do Recibo"
        : key === "municipio" ? "Município"
        : key === "situacao" ? "Situação do Imóvel"
        : "Fase do Processo";
      missing.push(humano);
    } else {
      idx[key as keyof typeof REQUIRED_COLUMNS] = found;
    }
  }

  if (missing.length > 0) {
    throw new CarParseError(
      "MISSING_COLUMN",
      `Coluna(s) obrigatória(s) ausente(s): ${missing.join(", ")}. Adicione ao arquivo antes de importar.`,
      { missing, headerLido: header },
    );
  }

  return idx;
}

/**
 * Parse principal. Recebe o buffer bruto do upload e retorna as linhas
 * validadas + metadados. **Não classifica** — isso é responsabilidade
 * do módulo `classifier.ts`.
 */
export function parseCarCsv(
  input: Buffer | ArrayBuffer | Uint8Array,
): ParseCarCsvResult {
  // Buffer extends Uint8Array em Node, então uma só checagem cobre Buffer + Uint8Array.
  const buffer: Uint8Array =
    input instanceof Uint8Array ? input : new Uint8Array(input);

  if (buffer.byteLength === 0) {
    throw new CarParseError("EMPTY_FILE", "Arquivo vazio.");
  }
  if (buffer.byteLength > MAX_BYTES) {
    throw new CarParseError(
      "FILE_TOO_LARGE",
      `Arquivo excede ${MAX_BYTES / 1024 / 1024} MB.`,
      { size: buffer.byteLength },
    );
  }

  const encoding = detectEncoding(buffer);
  const text = new TextDecoder(encoding).decode(buffer);
  const lines = text.split(/\r\n|\n|\r/);
  if (lines.length === 0 || lines[0].trim() === "") {
    throw new CarParseError("EMPTY_FILE", "Arquivo sem cabeçalho.");
  }

  const header = parseCsvLine(lines[0]).map((c) => c.trim());
  const idx = mapColumns(header);

  const rows: ParsedCarRow[] = [];
  const situacoesSet = new Set<string>(CAR_SITUACOES);
  let descartadas = 0;

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || raw.trim() === "" || raw.replace(/;/g, "").trim() === "") {
      descartadas++;
      continue;
    }
    const cells = parseCsvLine(raw);
    const numeroRecibo = (cells[idx.numeroRecibo] ?? "").trim();
    const municipio = (cells[idx.municipio] ?? "").trim();
    const situacao = (cells[idx.situacao] ?? "").trim();
    const faseOriginal = (cells[idx.faseOriginal] ?? "").trim();

    if (!numeroRecibo || !municipio || !situacao || !faseOriginal) {
      descartadas++;
      continue;
    }
    if (!situacoesSet.has(situacao)) {
      throw new CarParseError(
        "INVALID_SITUACAO",
        `Linha ${i + 1}: "Situação do Imóvel" = "${situacao}" não é um valor conhecido. ` +
          `Esperado: ${CAR_SITUACOES.join(", ")}.`,
        { linha: i + 1, situacaoRecebida: situacao },
      );
    }

    rows.push({
      numeroRecibo,
      municipio,
      situacao: situacao as CarSituacao,
      faseOriginal,
      linha: i + 1,
    });

    if (rows.length > MAX_ROWS) {
      throw new CarParseError(
        "FILE_TOO_LARGE",
        `Arquivo excede ${MAX_ROWS.toLocaleString("pt-BR")} linhas.`,
        { linhas: rows.length },
      );
    }
  }

  return {
    rows,
    totalLinhas: rows.length,
    encoding,
    header,
    linhasDescartadas: descartadas,
  };
}
