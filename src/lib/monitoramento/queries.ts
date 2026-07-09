/**
 * Queries do módulo Monitoramento — batem contra as views SQL
 * `resumo_por_intervalo` e `resumo_por_comunidade` via SQL bruto no cliente Drizzle.
 *
 * O driver postgres-js entrega o resultado do `db.execute` como um objeto
 * do tipo Result que estende Array (rows numerados) e também expõe `.length`.
 * Para consumidores TypeScript, materializamos em Array.from(...) para eliminar
 * qualquer ambiguidade de shape.
 */

import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export interface ResumoIntervalo {
  programa_id: string;
  programa_sigla: string;
  programa_nome: string;
  intervalo_id: string;
  intervalo_rotulo: string;
  intervalo_ordem: number;
  data_inicio: string;
  data_fim: string;
  meta_familias: number | null;
  meta_car: number | null;
  meta_titulos: number | null;
  comunidades_total: number;
  titulos_total: number;
  car_total: number;
  familias_total: number;
  validados_total: number;
  pct_familias: string | null;
  pct_car: string | null;
}

export interface ResumoComunidade {
  programa_id: string;
  programa_sigla: string;
  intervalo_id: string;
  intervalo_rotulo: string;
  intervalo_ordem: number;
  comunidade_id: string;
  comunidade: string;
  comunidade_tipo: string;
  municipio: string | null;
  titulos_total: number;
  car_total: number;
  familias_total: number;
  validados_total: number;
}

function toArray<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows: unknown }).rows;
    if (Array.isArray(rows)) return rows as T[];
  }
  return [];
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function listResumoIntervalosByPrograma(
  programaSigla: string,
): Promise<ResumoIntervalo[]> {
  const res = await db.execute(sql`
    SELECT * FROM resumo_por_intervalo
    WHERE programa_sigla = ${programaSigla}
    ORDER BY intervalo_ordem
  `);
  const rows = toArray<ResumoIntervalo>(res);
  return rows.map((r) => ({
    ...r,
    titulos_total: toNum(r.titulos_total),
    car_total: toNum(r.car_total),
    familias_total: toNum(r.familias_total),
    validados_total: toNum(r.validados_total),
    comunidades_total: toNum(r.comunidades_total),
  }));
}

export async function listResumoComunidades(
  programaSigla: string,
  intervaloId?: string,
): Promise<ResumoComunidade[]> {
  const res = intervaloId
    ? await db.execute(sql`
        SELECT * FROM resumo_por_comunidade
        WHERE programa_sigla = ${programaSigla} AND intervalo_id = ${intervaloId}
        ORDER BY titulos_total DESC, comunidade
      `)
    : await db.execute(sql`
        SELECT * FROM resumo_por_comunidade
        WHERE programa_sigla = ${programaSigla}
        ORDER BY titulos_total DESC, comunidade
      `);
  const rows = toArray<ResumoComunidade>(res);
  return rows.map((r) => ({
    ...r,
    titulos_total: toNum(r.titulos_total),
    car_total: toNum(r.car_total),
    familias_total: toNum(r.familias_total),
    validados_total: toNum(r.validados_total),
  }));
}

export async function listProgramas(): Promise<
  { sigla: string; nome: string; orgao: string | null }[]
> {
  const res = await db.execute(
    sql`SELECT sigla, nome, orgao FROM programas WHERE ativo ORDER BY sigla`,
  );
  return toArray<{ sigla: string; nome: string; orgao: string | null }>(res);
}
