/**
 * Importer do ranking nacional por UF — parse do arquivo (XLSX ou CSV)
 * + upsert atômico em `car_uf_ranking`.
 *
 * Convenção: 1 importação por (ano, mes). Reimportar sobrescreve as 27 linhas.
 *
 * Tema fixo por enquanto: `regularidade_ambiental_concluida` — o único que a
 * planilha oficial do SICAR fornece. Se houver múltiplos temas no futuro,
 * expor isso como parâmetro do importer.
 */

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { carUfRanking } from "@/lib/db/car";
import {
  parseUfRankingFile,
  type ParsedUfRankingRow,
  type UfCode,
} from "./uf-ranking-parser";

export const DEFAULT_TEMA_SLUG = "analise_concluida";
export const DEFAULT_TEMA_ROTULO = "Análise concluída";

export interface UfRankingPreview {
  ano: number;
  mes: number;
  rows: ParsedUfRankingRow[];
  soma: number;
  linhaTotalArquivo: number | null;
  ufsAusentes: UfCode[];
  /** Se já existe importação pra esse (ano, mes). */
  jaExiste: {
    totalUfs: number;
    somaExistente: number;
  } | null;
}

export interface UfRankingCommitStats {
  ano: number;
  mes: number;
  ufsInseridas: number;
  soma: number;
}

export class UfRankingOverwriteRequired extends Error {
  constructor(public jaExiste: { totalUfs: number; somaExistente: number }) {
    super(
      `Ranking do período já existe (${jaExiste.totalUfs} UFs, soma ${jaExiste.somaExistente.toLocaleString("pt-BR")}). Confirme sobrescrita.`,
    );
    this.name = "UfRankingOverwriteRequired";
  }
}

async function verificarExistente(
  ano: number,
  mes: number,
): Promise<{ totalUfs: number; somaExistente: number } | null> {
  const rows = await db
    .select({ uf: carUfRanking.uf, total: carUfRanking.total })
    .from(carUfRanking)
    .where(and(eq(carUfRanking.ano, ano), eq(carUfRanking.mes, mes)));
  if (rows.length === 0) return null;
  return {
    totalUfs: rows.length,
    somaExistente: rows.reduce((s, r) => s + r.total, 0),
  };
}

export async function buildUfRankingPreview(
  buffer: Buffer,
  ano: number,
  mes: number,
): Promise<UfRankingPreview> {
  const parsed = parseUfRankingFile(buffer);
  const jaExiste = await verificarExistente(ano, mes);
  return {
    ano,
    mes,
    rows: parsed.rows,
    soma: parsed.soma,
    linhaTotalArquivo: parsed.linhaTotalArquivo,
    ufsAusentes: parsed.ufsAusentes,
    jaExiste,
  };
}

export async function commitUfRanking(input: {
  buffer: Buffer;
  ano: number;
  mes: number;
  overwrite: boolean;
}): Promise<UfRankingCommitStats> {
  const parsed = parseUfRankingFile(input.buffer);
  const existente = await verificarExistente(input.ano, input.mes);
  if (existente && !input.overwrite) {
    throw new UfRankingOverwriteRequired(existente);
  }

  await db.transaction(async (tx) => {
    if (existente) {
      await tx
        .delete(carUfRanking)
        .where(
          and(
            eq(carUfRanking.ano, input.ano),
            eq(carUfRanking.mes, input.mes),
          ),
        );
    }
    await tx.insert(carUfRanking).values(
      parsed.rows.map((r) => ({
        ano: input.ano,
        mes: input.mes,
        uf: r.uf,
        total: r.total,
        temaSlug: DEFAULT_TEMA_SLUG,
        temaRotulo: DEFAULT_TEMA_ROTULO,
      })),
    );
  });

  return {
    ano: input.ano,
    mes: input.mes,
    ufsInseridas: parsed.rows.length,
    soma: parsed.soma,
  };
}
