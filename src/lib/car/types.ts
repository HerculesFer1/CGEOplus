/**
 * Tipos compartilhados do módulo CAR.
 *
 * Espelham os enums do banco em `src/lib/db/car.ts` — mantenha em sincronia
 * quando qualquer enum for alterado.
 */

export type CarBucket =
  | "AG_GESTOR"
  | "PENDENTE"
  | "VALIDADO"
  | "CANCELADO"
  | "SUSPENSO"
  | "NAO_CLASSIFICADO";

export type CarSituacao =
  | "Ativo"
  | "Cancelado"
  | "Pendente"
  | "Retificado"
  | "Suspenso";

/** Situações válidas (para validação de linha do CSV). */
export const CAR_SITUACOES: readonly CarSituacao[] = [
  "Ativo",
  "Cancelado",
  "Pendente",
  "Retificado",
  "Suspenso",
] as const;

/** Buckets agregados exibidos no dashboard, na ordem canônica. */
export const CAR_BUCKETS_AGREGADOS: readonly CarBucket[] = [
  "AG_GESTOR",
  "PENDENTE",
  "VALIDADO",
  "CANCELADO",
  "SUSPENSO",
  "NAO_CLASSIFICADO",
] as const;

/** Uma linha parseada do CSV do SICAR, ainda sem bucket atribuído. */
export interface ParsedCarRow {
  numeroRecibo: string;
  municipio: string;
  situacao: CarSituacao;
  faseOriginal: string;
  /** Linha 1-based (linha 1 é o cabeçalho). Útil para reportar erros. */
  linha: number;
}

/** Linha após classificação: bucket resolvido (ou NAO_CLASSIFICADO se fase é nova). */
export interface ClassifiedCarRow extends ParsedCarRow {
  bucket: CarBucket;
}

/** Códigos de erro do parser — usados pela UI para decidir o que mostrar. */
export type CarParseErrorCode =
  | "EMPTY_FILE"
  | "MISSING_COLUMN"
  | "INVALID_HEADER"
  | "INVALID_SITUACAO"
  | "EMPTY_ROW"
  | "FILE_TOO_LARGE";

export class CarParseError extends Error {
  constructor(
    public code: CarParseErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CarParseError";
  }
}

/** Contadores agregados para o preview do modal de importação. */
export interface CarPreview {
  totalRegistros: number;
  totalPorBucket: Record<CarBucket, number>;
  totalPorSituacao: Record<CarSituacao, number>;
  /** Município → contadores. Ordenado por total decrescente. */
  porMunicipio: Array<{ municipio: string; total: number; porBucket: Partial<Record<CarBucket, number>> }>;
  /** Fases distintas encontradas com contagem — para o modal listar novidades. */
  fasesReconhecidas: Array<{ fase: string; bucket: CarBucket; count: number }>;
  fasesNaoClassificadas: Array<{ fase: string; count: number }>;
}
