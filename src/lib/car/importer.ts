/**
 * Importer do módulo CAR — orquestra parse → classify → persistência no banco.
 *
 * Fluxo em duas fases (server actions em `src/app/car/importar/actions.ts`):
 *   1. **preview**: parseia + carrega mapa Fase→Bucket + classifica → devolve
 *      preview e detecta importação preexistente do mesmo mês/ano (para a UI
 *      pedir confirmação de sobrescrita).
 *   2. **commit**: parseia de novo (padrão do projeto — evita session state),
 *      aplica resoluções manuais de fases novas, grava em transação
 *      (`car_importacao` + `car_registro` em batches + upsert em
 *      `car_fase_bucket_map`).
 */

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  carFaseBucketMap,
  carImportacao,
  carRegistro,
} from "@/lib/db/car";
import { applyManualResolutions, classifyRows, type ClassifyResult } from "./classifier";
import { parseCarCsv } from "./parser";
import type {
  CarBucket,
  CarPreview,
  ClassifiedCarRow,
  ParsedCarRow,
} from "./types";

/** Batch de INSERT INTO car_registro. Postgres tem hard-limit de 65535
 *  parâmetros por statement — com 6 colunas, ~10k por batch. Usamos 3000
 *  para folga e para não estourar o request body em transações longas. */
const CAR_REGISTRO_BATCH = 3000;

export interface CarImportacaoResumo extends CarPreview {
  encoding: "utf-8" | "windows-1252";
  linhasDescartadas: number;
}

export interface ExistingImportInfo {
  id: string;
  ano: number;
  mes: number;
  totalRegistros: number;
  importadoEm: string; // ISO
  status: "processando" | "concluida" | "parcial" | "falhou";
}

export interface CarPreviewResult {
  parsed: ParsedCarRow[];
  classify: ClassifyResult;
  encoding: "utf-8" | "windows-1252";
  linhasDescartadas: number;
  existente: ExistingImportInfo | null;
}

export interface CarCommitInput {
  buffer: Buffer;
  ano: number;
  mes: number;
  arquivo: string;
  /** Resoluções manuais informadas pelo operador no modal. */
  resolucoes: Map<string, CarBucket>;
  importadoPor?: string | null;
  overwrite: boolean;
}

export interface CarCommitStats {
  importacaoId: string;
  totalRegistros: number;
  novasFasesGravadas: number;
  status: "concluida" | "parcial";
  /** Buckets finais persistidos (para o toast de sucesso). */
  totalPorBucket: Record<CarBucket, number>;
}

/* ── Read helpers ────────────────────────────────────────────────────────── */

export async function loadFaseBucketMap(): Promise<Map<string, CarBucket>> {
  const rows = await db
    .select({
      fase: carFaseBucketMap.faseOriginal,
      bucket: carFaseBucketMap.bucket,
    })
    .from(carFaseBucketMap);
  return new Map(rows.map((r) => [r.fase, r.bucket]));
}

export async function getExistingImport(
  ano: number,
  mes: number,
): Promise<ExistingImportInfo | null> {
  const rows = await db
    .select({
      id: carImportacao.id,
      ano: carImportacao.ano,
      mes: carImportacao.mes,
      totalRegistros: carImportacao.totalRegistros,
      importadoEm: carImportacao.importadoEm,
      status: carImportacao.status,
    })
    .from(carImportacao)
    .where(and(eq(carImportacao.ano, ano), eq(carImportacao.mes, mes)));
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    ano: r.ano,
    mes: r.mes,
    totalRegistros: r.totalRegistros,
    importadoEm: r.importadoEm.toISOString(),
    status: r.status,
  };
}

/* ── Preview ─────────────────────────────────────────────────────────────── */

/** Executa parse + classificação e devolve tudo o que o modal precisa. */
export async function buildCarPreview(
  buffer: Buffer,
  ano: number,
  mes: number,
): Promise<CarPreviewResult> {
  const parsed = parseCarCsv(buffer);
  const map = await loadFaseBucketMap();
  const classify = classifyRows(parsed.rows, map);
  const existente = await getExistingImport(ano, mes);

  return {
    parsed: parsed.rows,
    classify,
    encoding: parsed.encoding,
    linhasDescartadas: parsed.linhasDescartadas,
    existente,
  };
}

/* ── Commit ──────────────────────────────────────────────────────────────── */

/** Aplica resoluções manuais + persiste no banco em transação atômica. */
export async function commitCarImport(
  input: CarCommitInput,
): Promise<CarCommitStats> {
  // Re-parseia o arquivo (mesmo padrão do módulo Monitoramento — evita session).
  const parsed = parseCarCsv(input.buffer);

  // Recarrega o mapa (pode ter mudado entre preview e commit) e mescla com as
  // resoluções manuais — resoluções vencem em caso de conflito.
  const dbMap = await loadFaseBucketMap();
  const finalMap = new Map(dbMap);
  for (const [fase, bucket] of input.resolucoes) finalMap.set(fase, bucket);

  const classify = classifyRows(parsed.rows, finalMap);
  const status: "concluida" | "parcial" =
    classify.preview.fasesNaoClassificadas.length > 0 ? "parcial" : "concluida";

  const existente = await getExistingImport(input.ano, input.mes);
  if (existente && !input.overwrite) {
    // Sinal para o caller: cliente precisa confirmar sobrescrita.
    throw new CarOverwriteRequired(existente);
  }

  const checksum = await sha256(input.buffer);
  const resumo: CarImportacaoResumo = {
    ...classify.preview,
    encoding: parsed.encoding,
    linhasDescartadas: parsed.linhasDescartadas,
  };

  const importacaoId = await db.transaction(async (tx) => {
    if (existente) {
      // CASCADE em car_registro apaga tudo em uma ida ao banco.
      await tx.delete(carImportacao).where(eq(carImportacao.id, existente.id));
    }

    const [inserted] = await tx
      .insert(carImportacao)
      .values({
        ano: input.ano,
        mes: input.mes,
        arquivoOriginal: input.arquivo,
        arquivoChecksum: checksum,
        totalRegistros: classify.classified.length,
        importadoPor: input.importadoPor ?? null,
        status,
        resumo,
      })
      .returning({ id: carImportacao.id });

    // Insert em batches para respeitar o limite de parâmetros do Postgres.
    for (let i = 0; i < classify.classified.length; i += CAR_REGISTRO_BATCH) {
      const batch = classify.classified.slice(i, i + CAR_REGISTRO_BATCH);
      await tx.insert(carRegistro).values(
        batch.map((r) => ({
          importId: inserted.id,
          numeroRecibo: r.numeroRecibo,
          municipio: r.municipio,
          situacao: r.situacao,
          faseOriginal: r.faseOriginal,
          bucket: r.bucket,
        })),
      );
    }

    // Upsert das fases resolvidas manualmente (origem = manual).
    if (input.resolucoes.size > 0) {
      const values = Array.from(input.resolucoes).map(([fase, bucket]) => ({
        faseOriginal: fase,
        bucket,
        origem: "manual" as const,
        criadoPor: input.importadoPor ?? null,
      }));
      await tx
        .insert(carFaseBucketMap)
        .values(values)
        .onConflictDoUpdate({
          target: carFaseBucketMap.faseOriginal,
          set: {
            bucket: sql`excluded.bucket`,
            origem: sql`excluded.origem`,
            criadoPor: sql`excluded.criado_por`,
          },
        });
    }

    return inserted.id;
  });

  return {
    importacaoId,
    totalRegistros: classify.classified.length,
    novasFasesGravadas: input.resolucoes.size,
    status,
    totalPorBucket: classify.preview.totalPorBucket,
  };
}

/** Erro sinalizador de sobrescrita necessária — o caller decide reapresentar
 *  ao usuário ou tentar de novo com `overwrite=true`. */
export class CarOverwriteRequired extends Error {
  constructor(public existente: ExistingImportInfo) {
    super(
      `Já existe importação de ${String(existente.mes).padStart(2, "0")}/${existente.ano} (${existente.totalRegistros.toLocaleString("pt-BR")} registros).`,
    );
    this.name = "CarOverwriteRequired";
  }
}

async function sha256(buf: Buffer): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(buf).digest("hex");
}

/** Re-exportado só por conveniência de testes. */
export { applyManualResolutions };
export type { ClassifiedCarRow, ParsedCarRow };
