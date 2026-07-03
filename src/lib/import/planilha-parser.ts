/**
 * Parser da planilha PROCESSOS_CONTABILIZAR_[2026].xlsx
 *
 * Lê todas as abas mensais e retorna linhas normalizadas.
 * Ignora abas PAINEL e GRÁFICOS.
 */

import * as XLSX from "xlsx";

const MESES_ABAS = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "MARCO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];

const IGNORAR = new Set(["PAINEL", "GRÁFICOS", "GRAFICOS"]);

export type SistemaPlanilha = "SEI" | "SIGA" | "SICAR" | "SINAFLOR";
export type FinalidadeSicar = "Lancamento" | "Analise" | "Mapeamento";
export type ResultadoPlanilha =
  | "Finalizado"
  | "Analisado com pendencia"
  | "Indeferido"
  | "Desarquivado";
export type SetorDestinoPlanilha =
  | "Concluido no setor"
  | "CGEO"
  | "FLORESTA"
  | "Licenciamento"
  | "SICAR";

export interface LinhaPlanilha {
  aba: string;
  linhaNumero: number;
  dataAnalise: string; // YYYY-MM-DD
  sistema: SistemaPlanilha;
  sicarFinalidade: FinalidadeSicar | null;
  numeroProcesso: string;
  analistaApelido: string;
  resultado: ResultadoPlanilha;
  setorDestino: SetorDestinoPlanilha | null;
  observacoes: string | null;
}

export interface LinhaErro {
  aba: string;
  linhaNumero: number;
  raw: unknown[];
  problema: string;
}

export interface ParseResult {
  linhas: LinhaPlanilha[];
  erros: LinhaErro[];
  abasProcessadas: string[];
  abasIgnoradas: string[];
}

/* ----------------------- helpers de normalização ----------------------- */

function normalizeString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function parseData(v: unknown): string | null {
  if (v instanceof Date) {
    const iso = v.toISOString();
    return iso.slice(0, 10);
  }
  if (typeof v === "number") {
    // Serial Excel — 1900-based
    const jsDate = XLSX.SSF.parse_date_code(v);
    if (!jsDate) return null;
    const y = String(jsDate.y).padStart(4, "0");
    const m = String(jsDate.m).padStart(2, "0");
    const d = String(jsDate.d).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    // Formato dd/mm/aaaa
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) {
      const dd = m[1].padStart(2, "0");
      const mm = m[2].padStart(2, "0");
      const yy = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${yy}-${mm}-${dd}`;
    }
  }
  return null;
}

function parseSistema(v: unknown): {
  sistema: SistemaPlanilha | null;
  finalidade: FinalidadeSicar | null;
} {
  const s = normalizeString(v).toUpperCase();
  if (!s) return { sistema: null, finalidade: null };

  if (s === "SEI") return { sistema: "SEI", finalidade: null };
  if (s === "SIGA") return { sistema: "SIGA", finalidade: null };
  if (s === "SINAFLOR") return { sistema: "SINAFLOR", finalidade: null };

  if (s.startsWith("SICAR")) {
    if (s.includes("LAN") || s.includes("LANCAMENTO") || s.includes("LANÇAMENTO"))
      return { sistema: "SICAR", finalidade: "Lancamento" };
    if (s.includes("ANALISE") || s.includes("ANÁLISE"))
      return { sistema: "SICAR", finalidade: "Analise" };
    if (s.includes("MAPEAMENTO") || s.includes("MAP"))
      return { sistema: "SICAR", finalidade: "Mapeamento" };
    // SICAR "puro" sem sufixo — assume Análise por padrão
    return { sistema: "SICAR", finalidade: "Analise" };
  }
  return { sistema: null, finalidade: null };
}

function parseResultado(v: unknown): ResultadoPlanilha | null {
  const s = normalizeString(v).toLowerCase();
  if (!s) return null;
  if (s.includes("finaliz")) return "Finalizado";
  if (s.includes("pend") || s.includes("pêndencia") || s.includes("pendência"))
    return "Analisado com pendencia";
  if (s.includes("indefer")) return "Indeferido";
  if (s.includes("desarquiv")) return "Desarquivado";
  return null;
}

function parseSetorDestino(v: unknown): SetorDestinoPlanilha | null {
  const s = normalizeString(v);
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower.includes("conclu") || lower.includes("no setor"))
    return "Concluido no setor";
  if (lower === "cgeo") return "CGEO";
  if (lower === "floresta") return "FLORESTA";
  if (lower.includes("licenc")) return "Licenciamento";
  if (lower === "sicar") return "SICAR";
  return null;
}

/**
 * Mapa de apelidos da planilha → identificador para lookup posterior.
 * Preserva o formato original (com acento) para o servidor identificar.
 */
export function normalizeAnalistaName(v: unknown): string {
  return normalizeString(v);
}

/* ----------------------- parser principal ----------------------- */

export function parsePlanilha(buffer: ArrayBuffer | Buffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const abasProcessadas: string[] = [];
  const abasIgnoradas: string[] = [];
  const linhas: LinhaPlanilha[] = [];
  const erros: LinhaErro[] = [];

  for (const sheetName of wb.SheetNames) {
    const upper = sheetName.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const upperOriginal = sheetName.toUpperCase();

    if (IGNORAR.has(upperOriginal) || IGNORAR.has(upper)) {
      abasIgnoradas.push(sheetName);
      continue;
    }

    const isMonth = MESES_ABAS.some(
      (m) => m.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "") === upper,
    );

    if (!isMonth) {
      abasIgnoradas.push(sheetName);
      continue;
    }

    abasProcessadas.push(sheetName);

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: null,
      blankrows: false,
    });

    // Primeira linha é o cabeçalho — pulamos
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((c) => c === null || c === undefined || c === "")) continue;

      const [dia, sistemaRaw, processo, analista, status, setor, obs] = row;

      const dataAnalise = parseData(dia);
      const { sistema, finalidade } = parseSistema(sistemaRaw);
      const numeroProcesso = normalizeString(processo);
      const analistaApelido = normalizeAnalistaName(analista);
      const resultado = parseResultado(status);
      const setorDestino = parseSetorDestino(setor);
      const observacoes = normalizeString(obs) || null;

      if (!dataAnalise) {
        erros.push({ aba: sheetName, linhaNumero: i + 1, raw: row, problema: "Data inválida ou vazia" });
        continue;
      }
      if (!sistema) {
        erros.push({ aba: sheetName, linhaNumero: i + 1, raw: row, problema: `Sistema desconhecido: "${sistemaRaw}"` });
        continue;
      }
      if (!numeroProcesso) {
        erros.push({ aba: sheetName, linhaNumero: i + 1, raw: row, problema: "Número do processo vazio" });
        continue;
      }
      if (!analistaApelido) {
        erros.push({ aba: sheetName, linhaNumero: i + 1, raw: row, problema: "Analista vazio" });
        continue;
      }
      if (!resultado) {
        erros.push({ aba: sheetName, linhaNumero: i + 1, raw: row, problema: `Status desconhecido: "${status}"` });
        continue;
      }

      linhas.push({
        aba: sheetName,
        linhaNumero: i + 1,
        dataAnalise,
        sistema,
        sicarFinalidade: finalidade,
        numeroProcesso,
        analistaApelido,
        resultado,
        setorDestino,
        observacoes,
      });
    }
  }

  return { linhas, erros, abasProcessadas, abasIgnoradas };
}
