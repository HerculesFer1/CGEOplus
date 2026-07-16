/**
 * Sincronização Queimadas BDQ-INPE (AQ1km V6 Coleção 2).
 *
 * 3 datasets:
 *   1. Execução anual (totais estaduais)                     → `monit_ext_queimadas_ano`
 *   2. Resumo municipal × ano (com destaque de prioritárias) → `monit_ext_queimadas_municipio_ano`
 *   3. Granular município × ano × mês × classe AHP (~19k)    → `monit_ext_queimadas_municipio_mes_classe`
 *
 * Todos os dados vêm do Supabase upstream (tabelas `qb_*`). Não há JSON estático
 * — o pipeline INPE deles grava direto no banco. Paginamos em chunks porque
 * `qb_cicatrizes_classes` tem ~19k linhas.
 */

import { sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  monitExtQueimadasAno,
  monitExtQueimadasMunicipioAno,
  monitExtQueimadasMunicipioMesClasse,
} from "@/lib/db/monitoramento-externo";
import { UPSTREAM_SUPABASE_URL } from "./constants";
import { fetchPostgrest } from "./upstream-client";

interface QbExecucao {
  ano: number;
  n_cicatrizes_piaui: number;
  area_queimada_ha: number | string;
  n_municipios_afetados: number;
  meses_com_dados: string;
  fonte_dados: string;
  executado_em: string;
}

interface QbMunicipioResumo {
  municipio_cod: string;
  municipio_nome: string;
  ano: number;
  area_queimada_total_ha: number | string;
  n_cicatrizes_total: number;
  classe_max_queimada: number | null;
  pct_area_prioritaria: number | string | null;
  mes_pico: number | null;
}

interface QbCicatrizClasse {
  municipio_cod: string;
  ano: number;
  mes: number;
  classe_prioridade: number;
  prioridade_label: string | null;
  area_queimada_ha: number | string;
  n_cicatrizes: number;
}

interface SyncResult {
  registrosInseridos: number;
  detalhes: {
    anos: number;
    municipiosAno: number;
    mesClasse: number;
  };
  fonteUrl: string;
}

function n(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return "0";
  return typeof v === "number" ? String(v) : v;
}

export async function syncQueimadas(): Promise<SyncResult> {
  const [execucoes, municipiosAno, mesClasse] = await Promise.all([
    fetchPostgrest<QbExecucao>("qb_execucoes", {
      select:
        "ano,n_cicatrizes_piaui,area_queimada_ha,n_municipios_afetados," +
        "meses_com_dados,fonte_dados,executado_em",
      // Ordena por execução mais recente primeiro — depois deduplicamos por ano
      // (upstream pode ter várias execuções do mesmo ano; a última é a canônica).
      order: "executado_em.desc",
    }),
    fetchPostgrest<QbMunicipioResumo>("qb_municipios_resumo", {
      select:
        "municipio_cod,municipio_nome,ano,area_queimada_total_ha," +
        "n_cicatrizes_total,classe_max_queimada,pct_area_prioritaria,mes_pico",
      order: "ano.desc,area_queimada_total_ha.desc",
    }),
    fetchPostgrest<QbCicatrizClasse>("qb_cicatrizes_classes", {
      select:
        "municipio_cod,ano,mes,classe_prioridade,prioridade_label," +
        "area_queimada_ha,n_cicatrizes",
      order: "ano.desc,mes.asc",
      pageSize: 1000,
    }),
  ]);

  // Dedup: fica com a execução mais recente por ano (ordenação `.desc` acima).
  const anosMap = new Map<number, QbExecucao>();
  for (const e of execucoes) {
    if (!anosMap.has(e.ano)) anosMap.set(e.ano, e);
  }
  const anos = [...anosMap.values()].map((e) => ({
    ano: e.ano,
    nCicatrizes: e.n_cicatrizes_piaui,
    areaQueimadaHa: n(e.area_queimada_ha),
    nMunicipiosAfetados: e.n_municipios_afetados,
    mesesComDados: e.meses_com_dados,
    fonteDados: e.fonte_dados,
    executadoEmOrigem: new Date(e.executado_em),
  }));

  if (anos.length > 0) {
    await db
      .insert(monitExtQueimadasAno)
      .values(anos)
      .onConflictDoUpdate({
        target: monitExtQueimadasAno.ano,
        set: {
          nCicatrizes: sql.raw("EXCLUDED.n_cicatrizes"),
          areaQueimadaHa: sql.raw("EXCLUDED.area_queimada_ha"),
          nMunicipiosAfetados: sql.raw("EXCLUDED.n_municipios_afetados"),
          mesesComDados: sql.raw("EXCLUDED.meses_com_dados"),
          fonteDados: sql.raw("EXCLUDED.fonte_dados"),
          executadoEmOrigem: sql.raw("EXCLUDED.executado_em_origem"),
          atualizadoEm: sql`now()`,
        },
      });
  }

  // Municípios × ano — chunks de 500 pra evitar prepared statement gigante.
  for (const chunk of chunked(municipiosAno, 500)) {
    await db.execute(upsertMunicipiosAnoSql(chunk));
  }

  // Granular mês × classe — chunks de 1000, ~19 chunks total.
  for (const chunk of chunked(mesClasse, 1000)) {
    await db.execute(upsertMesClasseSql(chunk));
  }

  return {
    registrosInseridos: anos.length + municipiosAno.length + mesClasse.length,
    detalhes: {
      anos: anos.length,
      municipiosAno: municipiosAno.length,
      mesClasse: mesClasse.length,
    },
    fonteUrl: `${UPSTREAM_SUPABASE_URL}/qb_*`,
  };
}

function* chunked<T>(rows: T[], size: number): Generator<T[]> {
  for (let i = 0; i < rows.length; i += size) yield rows.slice(i, i + size);
}

function sqlLit(s: string | null | undefined): string {
  if (s === null || s === undefined) return "NULL";
  return `'${s.replace(/'/g, "''")}'`;
}

function upsertMunicipiosAnoSql(rows: QbMunicipioResumo[]) {
  const values = rows
    .map(
      (r) =>
        `(${sqlLit(r.municipio_cod)}, ${sqlLit(r.municipio_nome)}, ${r.ano}, ` +
        `${n(r.area_queimada_total_ha)}, ${r.n_cicatrizes_total}, ` +
        `${r.classe_max_queimada ?? "NULL"}, ` +
        `${r.pct_area_prioritaria ?? "NULL"}, ${r.mes_pico ?? "NULL"}, now())`,
    )
    .join(",");
  return sql.raw(
    `INSERT INTO monit_ext_queimadas_municipio_ano
       (municipio_cod, municipio_nome, ano, area_queimada_total_ha,
        n_cicatrizes_total, classe_max_queimada, pct_area_prioritaria,
        mes_pico, atualizado_em)
     VALUES ${values}
     ON CONFLICT (municipio_cod, ano) DO UPDATE SET
       municipio_nome         = EXCLUDED.municipio_nome,
       area_queimada_total_ha = EXCLUDED.area_queimada_total_ha,
       n_cicatrizes_total     = EXCLUDED.n_cicatrizes_total,
       classe_max_queimada    = EXCLUDED.classe_max_queimada,
       pct_area_prioritaria   = EXCLUDED.pct_area_prioritaria,
       mes_pico               = EXCLUDED.mes_pico,
       atualizado_em          = now()`,
  );
}

function upsertMesClasseSql(rows: QbCicatrizClasse[]) {
  const values = rows
    .map(
      (r) =>
        `(${sqlLit(r.municipio_cod)}, ${r.ano}, ${r.mes}, ${r.classe_prioridade}, ` +
        `${sqlLit(r.prioridade_label)}, ${n(r.area_queimada_ha)}, ${r.n_cicatrizes}, now())`,
    )
    .join(",");
  return sql.raw(
    `INSERT INTO monit_ext_queimadas_municipio_mes_classe
       (municipio_cod, ano, mes, classe_prioridade, prioridade_label,
        area_queimada_ha, n_cicatrizes, atualizado_em)
     VALUES ${values}
     ON CONFLICT (municipio_cod, ano, mes, classe_prioridade) DO UPDATE SET
       prioridade_label = EXCLUDED.prioridade_label,
       area_queimada_ha = EXCLUDED.area_queimada_ha,
       n_cicatrizes     = EXCLUDED.n_cicatrizes,
       atualizado_em    = now()`,
  );
}
