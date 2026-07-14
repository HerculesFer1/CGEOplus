/**
 * Queries de leitura do módulo CAR — usadas pelo dashboard `/car`.
 * Fonte principal é o JSONB `car_importacao.resumo` (pré-agregado no
 * commit da importação), evitando varrer `car_registro` (~334k rows) a
 * cada page load.
 */

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  carConfig,
  carFaseBucketMap,
  carImportacao,
  carSerieHistorica,
  carUfRanking,
} from "@/lib/db/car";

import type { CarImportacaoResumo } from "./importer";
import type { CarBucket } from "./types";

export interface CarImportacaoResumida {
  id: string;
  ano: number;
  mes: number;
  totalRegistros: number;
  importadoEm: string;
  status: "processando" | "concluida" | "parcial" | "falhou";
  resumo: CarImportacaoResumo;
}

/** Última importação (por ano/mes desc). Retorna null se não houver nenhuma. */
export async function getUltimaImportacao(): Promise<CarImportacaoResumida | null> {
  const rows = await db
    .select({
      id: carImportacao.id,
      ano: carImportacao.ano,
      mes: carImportacao.mes,
      totalRegistros: carImportacao.totalRegistros,
      importadoEm: carImportacao.importadoEm,
      status: carImportacao.status,
      resumo: carImportacao.resumo,
    })
    .from(carImportacao)
    .orderBy(desc(carImportacao.ano), desc(carImportacao.mes))
    .limit(1);

  const r = rows[0];
  if (!r || !r.resumo) return null;
  return {
    id: r.id,
    ano: r.ano,
    mes: r.mes,
    totalRegistros: r.totalRegistros,
    importadoEm: r.importadoEm.toISOString(),
    status: r.status,
    resumo: r.resumo as CarImportacaoResumo,
  };
}

/** Todas as importações em ordem cronológica (mais antiga primeiro).
 *  Usada para o gráfico de evolução temporal. */
export async function listImportacoesHistorico(): Promise<
  Array<{
    ano: number;
    mes: number;
    totalRegistros: number;
    resumo: CarImportacaoResumo;
  }>
> {
  const rows = await db
    .select({
      ano: carImportacao.ano,
      mes: carImportacao.mes,
      totalRegistros: carImportacao.totalRegistros,
      resumo: carImportacao.resumo,
    })
    .from(carImportacao)
    .orderBy(carImportacao.ano, carImportacao.mes);

  return rows
    .filter((r) => r.resumo)
    .map((r) => ({
      ano: r.ano,
      mes: r.mes,
      totalRegistros: r.totalRegistros,
      resumo: r.resumo as CarImportacaoResumo,
    }));
}

/** Ranking nacional por UF para o mês/ano informados. Vazio se ausente.
 *  Filtra por tema quando informado — hoje só existe um tema no banco. */
export async function getUfRanking(
  ano: number,
  mes: number,
  temaSlug?: string,
): Promise<Array<{ uf: string; total: number; temaRotulo: string }>> {
  const where = temaSlug
    ? and(
        eq(carUfRanking.ano, ano),
        eq(carUfRanking.mes, mes),
        eq(carUfRanking.temaSlug, temaSlug),
      )
    : and(eq(carUfRanking.ano, ano), eq(carUfRanking.mes, mes));

  const rows = await db
    .select({
      uf: carUfRanking.uf,
      total: carUfRanking.total,
      temaRotulo: carUfRanking.temaRotulo,
    })
    .from(carUfRanking)
    .where(where);

  return rows
    .map((r) => ({
      uf: r.uf.trim(),
      total: r.total,
      temaRotulo: r.temaRotulo,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface SerieHistoricaRow {
  periodoLabel: string;
  periodoOrdem: number;
  granularidade: "anual" | "mensal";
  agGestor: number;
  pendentes: number;
  validados: number;
  cancelados: number;
  suspensos: number;
  total: number;
}

/** Série histórica completa em ordem cronológica (2022 → mais recente). */
export async function getSerieHistorica(): Promise<SerieHistoricaRow[]> {
  const rows = await db
    .select({
      periodoLabel: carSerieHistorica.periodoLabel,
      periodoOrdem: carSerieHistorica.periodoOrdem,
      granularidade: carSerieHistorica.granularidade,
      agGestor: carSerieHistorica.agGestor,
      pendentes: carSerieHistorica.pendentes,
      validados: carSerieHistorica.validados,
      cancelados: carSerieHistorica.cancelados,
      suspensos: carSerieHistorica.suspensos,
      total: carSerieHistorica.total,
    })
    .from(carSerieHistorica)
    .orderBy(asc(carSerieHistorica.periodoOrdem));
  return rows;
}

/** Config do módulo CAR (baseline, thresholds). */
export async function getCarConfig(): Promise<Record<string, unknown>> {
  const rows = await db
    .select({ chave: carConfig.chave, valor: carConfig.valor })
    .from(carConfig);
  return Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
}

/** Fases atualmente em NAO_CLASSIFICADO (a partir do resumo da última importação). */
export function fasesNaoClassificadas(
  importacao: CarImportacaoResumida | null,
): Array<{ fase: string; count: number }> {
  return importacao?.resumo.fasesNaoClassificadas ?? [];
}

/** Contagem por bucket no mapa (audit info — usado em banner opcional). */
export async function contarBucketsNoMapa(): Promise<Record<CarBucket, number>> {
  const rows = await db
    .select({ bucket: carFaseBucketMap.bucket })
    .from(carFaseBucketMap);
  const out = {
    AG_GESTOR: 0,
    PENDENTE: 0,
    VALIDADO: 0,
    CANCELADO: 0,
    SUSPENSO: 0,
    NAO_CLASSIFICADO: 0,
  } as Record<CarBucket, number>;
  for (const r of rows) out[r.bucket]++;
  return out;
}
