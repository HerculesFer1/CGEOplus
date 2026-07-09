/**
 * Parser das planilhas de monitoramento (PSI, PILARES II).
 *
 * Aceita as abas de "detalhe" — as que contêm 1 linha por título:
 *   - PSI:     "PSI 2023", "PSI 2024", ..., "Anterior a 2023"
 *   - PILARES: "INTERVALO 1 - ...", "INTERVALO 2 - ..."
 *
 * Ignora abas de resumo, listas auxiliares e painéis.
 *
 * Mapeamento colunas → campos é feito por *fuzzy match* no cabeçalho
 * (normalize + contains), então tolera variações de acento/espaço/case
 * observadas entre PSI 2024 (tem espaço em "TIPO ") e PILARES II
 * (tem "PROJETO", "SNCR", "OBS" a mais).
 */

import * as XLSX from "xlsx";

/* --------------------------- Tipos --------------------------- */

export type CarStatus = "SIM" | "NAO" | "PENDENTE";

export interface LinhaTitulo {
  aba: string;
  linhaNumero: number;

  processoSei: string | null;
  beneficiario: string | null;
  cpfRaw: string | null;
  genero: string | null;
  estadoCivil: string | null;
  tipoImovel: string | null;

  comunidadeNome: string;
  municipio: string | null;
  territorio: string | null;

  numeroTitulos: number;
  numeroFamilias: number;

  tipo: string | null;
  categoriaTitulo: string | null;
  dataAssinatura: string; // YYYY-MM-DD

  carStatus: CarStatus;
  reciboCar: string | null;
  nomeLote: string | null;
  obsCar: string | null;
  cadastranteCar: string | null;

  projeto: string | null;
  sncr: string | null;
  faseProcesso: string | null;

  conferenciaCpfProprietario: string | null;
  conferenciaProprietario: string | null;
  conferenciaCadastrante: string | null;
}

export interface LinhaErro {
  aba: string;
  linhaNumero: number;
  problema: string;
}

export interface ParseResult {
  linhas: LinhaTitulo[];
  erros: LinhaErro[];
  abasProcessadas: string[];
  abasIgnoradas: string[];
}

/* --------------------------- Utils --------------------------- */

function stripAccents(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function normHeader(s: string): string {
  return stripAccents(String(s || ""))
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[^A-Z0-9 ]/g, "")
    .trim();
}

function normStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

const STOP_WORDS = new Set([
  "de", "do", "da", "dos", "das",
  "no", "na", "nos", "nas",
  "em", "e", "a", "o",
]);
const KEEP_UPPER = new Set([
  "PE", "PCT", "CAR", "SEI", "SIGA", "SICAR", "INCRA", "INTERPI",
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
]);

/**
 * Converte "TERRITÓRIO QUILOMBOLA CANADÁ CORRENTE" em
 * "Território Quilombola Canadá Corrente" preservando siglas conhecidas e
 * mantendo preposições em minúsculo. Aceita null.
 */
function toTitleCase<T extends string | null>(input: T): T {
  if (input === null) return input;
  return input
    .split(/(\s+|[\/\-])/)
    .map((token, idx) => {
      if (/^\s+$/.test(token) || /^[\/\-]$/.test(token)) return token;
      const upper = token.toUpperCase();
      if (KEEP_UPPER.has(upper)) return upper;
      const lower = token.toLowerCase();
      if (idx > 0 && STOP_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("") as T;
}

function toInt(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function parseDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${String(d.y).padStart(4, "0")}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const br = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (br) {
    const dd = br[1].padStart(2, "0");
    const mm = br[2].padStart(2, "0");
    const yy = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${yy}-${mm}-${dd}`;
  }
  return null;
}

function parseCarStatus(v: unknown): CarStatus {
  const s = normStr(v);
  if (!s) return "PENDENTE";
  const u = stripAccents(s).toUpperCase();
  if (u === "SIM" || u === "S" || u === "Y" || u === "YES") return "SIM";
  if (u === "NAO" || u === "N" || u === "NO") return "NAO";
  return "PENDENTE";
}

/* ---------- Abas: quais processar como detalhe ---------- */

function isDetalhe(name: string): boolean {
  const u = stripAccents(name).toUpperCase().trim();
  if (u.startsWith("PSI RESUMO")) return false;
  if (u.startsWith("RESUMO")) return false;
  if (u === "LISTA" || u === "LISTAS") return false;
  if (u === "AVANCO CADASTROVALIDACAO" || u === "AVANCO CADASTRO VALIDACAO") return false;
  if (u === "PAINEL" || u === "GRAFICOS") return false;

  // PSI YYYY / PSI DE YYYY / Anterior a 2023
  if (/^PSI\s+\d{4}$/.test(u)) return true;
  if (/^ANTERIOR/.test(u)) return true;
  // PILARES: INTERVALO 1 - ...
  if (/^INTERVALO\s+\d+/.test(u)) return true;

  return false;
}

/* ---------- Mapeamento cabeçalho → índice ---------- */

interface HeaderMap {
  processoSei: number;
  beneficiario: number;
  cpf: number;
  estadoCivil: number;
  genero: number;
  tipoImovel: number;
  comunidade: number;
  municipio: number;
  territorio: number;
  numTitulos: number;
  numFamilias: number;
  tipo: number;
  categoria: number;
  data: number;
  car: number;
  reciboCar: number;
  nomeLote: number;
  obsCar: number;
  cadastranteCar: number;
  projeto: number;
  sncr: number;
  faseProcesso: number;
  confCpfProprietario: number;
  confProprietario: number;
  confCadastrante: number;
}

const HEADER_KEYS: { field: keyof HeaderMap; matchers: string[] }[] = [
  { field: "processoSei",         matchers: ["PROCESSO SEI", "PROCESSO"] },
  { field: "beneficiario",        matchers: ["BENEFICIARIO"] },
  { field: "cpf",                 matchers: ["CPF"] },
  { field: "estadoCivil",         matchers: ["ESTADO CIVIL"] },
  { field: "genero",              matchers: ["GENERO"] },
  { field: "tipoImovel",          matchers: ["TIPO IMOVEL"] },
  { field: "comunidade",          matchers: ["COMUNIDADE"] },
  { field: "municipio",           matchers: ["MUNICIPIO"] },
  { field: "territorio",          matchers: ["TERRITORIO"] },
  { field: "numTitulos",          matchers: ["NUMERO DE TITULOS", "N DE TITULOS", "NUMERO TITULOS"] },
  { field: "numFamilias",         matchers: ["NUMERO DE FAMILIAS", "N DE FAMILIAS", "NUMERO FAMILIAS"] },
  { field: "tipo",                matchers: ["TIPO"] }, // curinga — verificado depois
  { field: "categoria",           matchers: ["CATEGORIA TITULO", "CATEGORIA"] },
  { field: "data",                matchers: ["DATA DE ASSINATURA", "DATA ASSINATURA", "DATA"] },
  { field: "car",                 matchers: ["CAR"] }, // curinga — o header "CAR" isolado
  { field: "reciboCar",           matchers: ["RECIBO CAR", "RECIBO DO CAR"] },
  { field: "nomeLote",            matchers: ["NOME LOTE", "NOME DO LOTE"] },
  { field: "obsCar",              matchers: ["OBS CAR", "OBSERVACAO CAR"] },
  { field: "cadastranteCar",      matchers: ["CADASTRANTE CAR", "CADASTRANTE DO CAR", "CADASTRANTE"] },
  { field: "projeto",             matchers: ["PROJETO"] },
  { field: "sncr",                matchers: ["SNCR"] },
  { field: "faseProcesso",        matchers: ["FASE PROCESSO", "FASE DO PROCESSO"] },
  { field: "confCpfProprietario", matchers: ["CONFERENCIA CPF PROPRIETARIO", "CONFERENCIA CPF"] },
  { field: "confProprietario",    matchers: ["CONFERENCIA PROPRIETARIO"] },
  { field: "confCadastrante",     matchers: ["CONFERENCIA CADASTRANTE"] },
];

function buildHeaderMap(headerRow: unknown[]): HeaderMap {
  const normalized = headerRow.map((h) => normHeader(String(h ?? "")));
  const map: Partial<HeaderMap> = {};

  // Passe 1: match exato pelo primeiro matcher que der hit substring
  for (const { field, matchers } of HEADER_KEYS) {
    let idx = -1;
    for (let i = 0; i < normalized.length; i++) {
      const h = normalized[i];
      if (!h) continue;

      // "CAR" e "TIPO" são curinga — só aceita hit exato para evitar
      // pegar "RECIBO CAR", "TIPO IMOVEL", "CATEGORIA TITULO".
      if (field === "car" || field === "tipo") {
        if (h === matchers[0]) { idx = i; break; }
        continue;
      }

      const hit = matchers.some((m) => h.includes(m));
      if (hit) { idx = i; break; }
    }
    map[field] = idx;
  }

  return map as HeaderMap;
}

/* --------------------------- Parser --------------------------- */

export function parsePlanilha(buffer: Buffer | ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const linhas: LinhaTitulo[] = [];
  const erros: LinhaErro[] = [];
  const abasProcessadas: string[] = [];
  const abasIgnoradas: string[] = [];

  for (const sheetName of wb.SheetNames) {
    if (!isDetalhe(sheetName)) {
      abasIgnoradas.push(sheetName);
      continue;
    }

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: null,
      blankrows: false,
    });

    if (rows.length < 2) {
      abasIgnoradas.push(sheetName);
      continue;
    }

    abasProcessadas.push(sheetName);
    const header = rows[0] as unknown[];
    const H = buildHeaderMap(header);

    for (let i = 1; i < rows.length; i++) {
      const linhaNumero = i + 1;
      const row = rows[i];
      if (!row || row.every((c) => c === null || c === undefined || c === "")) continue;

      const get = (idx: number): unknown => (idx < 0 ? null : row[idx]);

      const comunidadeNome = toTitleCase(normStr(get(H.comunidade)));
      const municipio = toTitleCase(normStr(get(H.municipio)));
      const dataAssinatura = parseDate(get(H.data));

      if (!comunidadeNome) {
        erros.push({ aba: sheetName, linhaNumero, problema: "Comunidade vazia." });
        continue;
      }
      if (!dataAssinatura) {
        erros.push({ aba: sheetName, linhaNumero, problema: "Data de assinatura vazia ou inválida." });
        continue;
      }

      linhas.push({
        aba: sheetName,
        linhaNumero,
        processoSei: normStr(get(H.processoSei)),
        beneficiario: normStr(get(H.beneficiario)),
        cpfRaw: normStr(get(H.cpf)),
        genero: normStr(get(H.genero)),
        estadoCivil: normStr(get(H.estadoCivil)),
        tipoImovel: normStr(get(H.tipoImovel)),
        comunidadeNome,
        municipio,
        territorio: normStr(get(H.territorio)),
        numeroTitulos: toInt(get(H.numTitulos), 0),
        numeroFamilias: toInt(get(H.numFamilias), 1),
        tipo: normStr(get(H.tipo)),
        categoriaTitulo: normStr(get(H.categoria)),
        dataAssinatura,
        carStatus: parseCarStatus(get(H.car)),
        reciboCar: normStr(get(H.reciboCar)),
        nomeLote: normStr(get(H.nomeLote)),
        obsCar: normStr(get(H.obsCar)),
        cadastranteCar: normStr(get(H.cadastranteCar)),
        projeto: normStr(get(H.projeto)),
        sncr: normStr(get(H.sncr)),
        faseProcesso: normStr(get(H.faseProcesso)),
        conferenciaCpfProprietario: normStr(get(H.confCpfProprietario)),
        conferenciaProprietario: normStr(get(H.confProprietario)),
        conferenciaCadastrante: normStr(get(H.confCadastrante)),
      });
    }
  }

  return { linhas, erros, abasProcessadas, abasIgnoradas };
}

/* ---------------- Slug de comunidade (uso externo) ---------------- */

export function slugComunidade(nome: string): string {
  return stripAccents(nome).toUpperCase().replace(/\s+/g, " ").trim();
}
