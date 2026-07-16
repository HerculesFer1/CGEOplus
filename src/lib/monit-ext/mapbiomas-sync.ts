/**
 * Sincronização MapBiomas Alertas.
 *
 * 3 datasets:
 *   1. Série anual + IPI → `monit_ext_mapbiomas_ano`
 *   2. Sazonalidade mensal → `monit_ext_mapbiomas_mensal`
 *   3. Snapshot por município × ano → `monit_ext_mapbiomas_municipio`
 *
 * Fontes: JSONs prontos no Vercel upstream (leve, 21KB + 710B) + tabela
 * `agregado_municipios` no Supabase upstream (~947 linhas). Ignoramos a coluna
 * `matopiba` explicitamente — será tratado em módulo próprio no futuro.
 */

import { db } from "@/lib/db/client";
import {
  monitExtMapbiomasAno,
  monitExtMapbiomasMensal,
  monitExtMapbiomasMunicipio,
} from "@/lib/db/monitoramento-externo";
import { UPSTREAM_VERCEL } from "./constants";
import { fetchPostgrest, fetchStaticJson } from "./upstream-client";

/* ==========================================================================
   Shapes upstream (documentam o que esperamos ler)
   ========================================================================== */

interface ResumoEstatico {
  alertYr: Record<string, { count: number; area: number; cerrado: number; caatinga: number }>;
  classifYr: Record<string, { irregular: number; autorizado: number; autorizado_p: number; regularizado: number }>;
  ipiYr: Record<string, number>;
}

/** Formato upstream: `{ "2025": [ha_jan, ha_fev, ..., ha_dez] }` — só área,
 *  sem contagem (o pipeline upstream não expõe count mensal). */
type MonthlyAlertas = Record<string, number[]>;

interface AgregadoMunicipioRow {
  municipio: string;
  ano: number;
  bioma_predominante: string | null;
  ha_irregular: number | string;
  ha_autorizado_total: number | string;
  ha_regularizado: number | string;
  ha_total: number | string;
  pct_irregular: number | string;
  num_alertas: number;
  vpressao_dominante_ptbr: string | null;
  reincidente: boolean;
  anos_com_alerta_irregular: number[] | null;
  defasagem_media_dias: number | string | null;
}

interface SyncResult {
  registrosInseridos: number;
  detalhes: {
    anos: number;
    meses: number;
    municipios: number;
  };
  fonteUrl: string;
}

/** Coerção segura de `numeric` PostgREST (às vezes chega como string). */
function n(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return "0";
  return typeof v === "number" ? v.toFixed(4) : v;
}

/* ==========================================================================
   Parsers
   ========================================================================== */

function parseAno(resumo: ResumoEstatico) {
  const anos = Object.keys(resumo.alertYr ?? {}).map(Number).filter(Number.isFinite);
  return anos.map((ano) => {
    const alert = resumo.alertYr[String(ano)];
    const classif = resumo.classifYr[String(ano)];
    const ipi = resumo.ipiYr[String(ano)] ?? 0;
    return {
      ano,
      nAlertas: alert.count,
      areaTotalHa: n(alert.area),
      areaIrregularHa: n(classif?.irregular ?? 0),
      areaAutorizadoHa: n(classif?.autorizado ?? 0),
      areaAutorizadoParcialHa: n(classif?.autorizado_p ?? 0),
      areaRegularizadoHa: n(classif?.regularizado ?? 0),
      cerradoHa: n(alert.cerrado),
      caatingaHa: n(alert.caatinga),
      ipiPct: n(ipi),
    };
  });
}

/** Upstream expõe só área mensal — count fica 0 no snapshot. */
function parseMensal(monthly: MonthlyAlertas) {
  const rows: { ano: number; mes: number; nAlertas: number; areaHa: string }[] = [];
  for (const [anoStr, meses] of Object.entries(monthly ?? {})) {
    const ano = Number(anoStr);
    if (!Number.isFinite(ano) || !Array.isArray(meses)) continue;
    for (let i = 0; i < 12 && i < meses.length; i++) {
      const area = meses[i];
      if (typeof area !== "number") continue;
      rows.push({ ano, mes: i + 1, nAlertas: 0, areaHa: n(area) });
    }
  }
  return rows;
}

function parseMunicipios(rows: AgregadoMunicipioRow[]) {
  return rows.map((r) => ({
    municipio: r.municipio,
    ano: r.ano,
    bioma: r.bioma_predominante,
    haTotal: n(r.ha_total),
    haIrregular: n(r.ha_irregular),
    haAutorizadoTotal: n(r.ha_autorizado_total),
    haRegularizado: n(r.ha_regularizado),
    pctIrregular: n(r.pct_irregular),
    numAlertas: r.num_alertas,
    vpressaoDominante: r.vpressao_dominante_ptbr,
    reincidente: r.reincidente,
    anosComAlertaIrregular: r.anos_com_alerta_irregular ?? [],
    defasagemMediaDias: r.defasagem_media_dias ? String(r.defasagem_media_dias) : null,
  }));
}

/* ==========================================================================
   Entry point
   ========================================================================== */

export async function syncMapbiomas(): Promise<SyncResult> {
  const [resumo, monthly, municipiosUpstream] = await Promise.all([
    fetchStaticJson<ResumoEstatico>("resumo_estatico"),
    fetchStaticJson<MonthlyAlertas>("monthly_alertas"),
    fetchPostgrest<AgregadoMunicipioRow>("agregado_municipios", {
      // Nunca puxamos matopiba: será tratado como módulo próprio depois.
      select:
        "municipio,ano,bioma_predominante,ha_irregular,ha_autorizado_total," +
        "ha_regularizado,ha_total,pct_irregular,num_alertas," +
        "vpressao_dominante_ptbr,reincidente,anos_com_alerta_irregular," +
        "defasagem_media_dias",
      order: "ano.desc,ha_irregular.desc",
    }),
  ]);

  const anos = parseAno(resumo);
  const meses = parseMensal(monthly);
  const municipios = parseMunicipios(municipiosUpstream);

  // Fallback: se `agregado_municipios` tem anos que ainda não estão em
  // `resumo_estatico.json` (o upstream demora mais para publicar o resumo),
  // derivamos a linha anual somando os municípios. Isso mantém o KPI anual
  // do CGEO+ em sincronia com o dashboard upstream, que também soma no
  // client. Ex.: em 2026 os municípios chegam antes do resumo, e sem esse
  // fallback o dashboard só listaria até 2025.
  const anosNoResumo = new Set(anos.map((a) => a.ano));
  const anosFaltando = new Map<number, AgregadoMunicipioRow[]>();
  for (const r of municipiosUpstream) {
    if (anosNoResumo.has(r.ano)) continue;
    const arr = anosFaltando.get(r.ano) ?? [];
    arr.push(r);
    anosFaltando.set(r.ano, arr);
  }
  for (const [ano, rows] of anosFaltando) {
    const agg = rows.reduce(
      (a, r) => {
        a.nAlertas += r.num_alertas;
        a.areaTotalHa += Number(r.ha_total) || 0;
        a.areaIrregularHa += Number(r.ha_irregular) || 0;
        a.areaAutorizadoHa += Number(r.ha_autorizado_total) || 0;
        a.areaRegularizadoHa += Number(r.ha_regularizado) || 0;
        return a;
      },
      {
        nAlertas: 0,
        areaTotalHa: 0,
        areaIrregularHa: 0,
        areaAutorizadoHa: 0,
        areaRegularizadoHa: 0,
      },
    );
    anos.push({
      ano,
      nAlertas: agg.nAlertas,
      areaTotalHa: n(agg.areaTotalHa),
      areaIrregularHa: n(agg.areaIrregularHa),
      areaAutorizadoHa: n(agg.areaAutorizadoHa),
      areaAutorizadoParcialHa: "0",
      areaRegularizadoHa: n(agg.areaRegularizadoHa),
      cerradoHa: "0",
      caatingaHa: "0",
      ipiPct:
        agg.areaTotalHa > 0
          ? ((agg.areaIrregularHa / agg.areaTotalHa) * 100).toFixed(2)
          : "0.00",
    });
  }

  // Upsert por chave natural — o cron é idempotente.
  if (anos.length > 0) {
    await db
      .insert(monitExtMapbiomasAno)
      .values(anos)
      .onConflictDoUpdate({
        target: monitExtMapbiomasAno.ano,
        set: {
          nAlertas: sqlExcluded("n_alertas"),
          areaTotalHa: sqlExcluded("area_total_ha"),
          areaIrregularHa: sqlExcluded("area_irregular_ha"),
          areaAutorizadoHa: sqlExcluded("area_autorizado_ha"),
          areaAutorizadoParcialHa: sqlExcluded("area_autorizado_parcial_ha"),
          areaRegularizadoHa: sqlExcluded("area_regularizado_ha"),
          cerradoHa: sqlExcluded("cerrado_ha"),
          caatingaHa: sqlExcluded("caatinga_ha"),
          ipiPct: sqlExcluded("ipi_pct"),
          atualizadoEm: sqlNow(),
        },
      });
  }

  if (meses.length > 0) {
    // Compound PK definido só no SQL (não no Drizzle) — usamos raw SQL clause.
    for (const chunk of chunked(meses, 500)) {
      await db.execute(
        upsertMensalSql(chunk),
      );
    }
  }

  if (municipios.length > 0) {
    for (const chunk of chunked(municipios, 500)) {
      await db.execute(upsertMunicipiosSql(chunk));
    }
  }

  return {
    registrosInseridos: anos.length + meses.length + municipios.length,
    detalhes: {
      anos: anos.length,
      meses: meses.length,
      municipios: municipios.length,
    },
    fonteUrl: `${UPSTREAM_VERCEL}/data (+ upstream Supabase)`,
  };
}

/* ==========================================================================
   Helpers (raw SQL para tabelas com PK composta — Drizzle não expõe onConflict
   por composite key sem constraint nomeada estável)
   ========================================================================== */

import { sql } from "drizzle-orm";

function sqlExcluded(col: string) {
  return sql.raw(`EXCLUDED.${col}`);
}

function sqlNow() {
  return sql`now()`;
}

function* chunked<T>(rows: T[], size: number): Generator<T[]> {
  for (let i = 0; i < rows.length; i += size) yield rows.slice(i, i + size);
}

function upsertMensalSql(
  rows: { ano: number; mes: number; nAlertas: number; areaHa: string }[],
) {
  const values = rows
    .map((r) => `(${r.ano}, ${r.mes}, ${r.nAlertas}, ${r.areaHa}, now())`)
    .join(",");
  return sql.raw(
    `INSERT INTO monit_ext_mapbiomas_mensal
       (ano, mes, n_alertas, area_ha, atualizado_em)
     VALUES ${values}
     ON CONFLICT (ano, mes) DO UPDATE SET
       n_alertas = EXCLUDED.n_alertas,
       area_ha   = EXCLUDED.area_ha,
       atualizado_em = now()`,
  );
}

function escapeSql(s: string | null | undefined): string {
  if (s === null || s === undefined) return "NULL";
  return `'${s.replace(/'/g, "''")}'`;
}

function upsertMunicipiosSql(
  rows: ReturnType<typeof parseMunicipios>,
) {
  const values = rows
    .map((r) => {
      const anosArr = `ARRAY[${r.anosComAlertaIrregular.join(",")}]::smallint[]`;
      const defasagem =
        r.defasagemMediaDias === null ? "NULL" : r.defasagemMediaDias;
      return (
        `(${escapeSql(r.municipio)}, ${r.ano}, ${escapeSql(r.bioma)}, ` +
        `${r.haTotal}, ${r.haIrregular}, ${r.haAutorizadoTotal}, ` +
        `${r.haRegularizado}, ${r.pctIrregular}, ${r.numAlertas}, ` +
        `${escapeSql(r.vpressaoDominante)}, ${r.reincidente}, ` +
        `${anosArr}, ${defasagem}, now())`
      );
    })
    .join(",");
  return sql.raw(
    `INSERT INTO monit_ext_mapbiomas_municipio
       (municipio, ano, bioma, ha_total, ha_irregular, ha_autorizado_total,
        ha_regularizado, pct_irregular, num_alertas, vpressao_dominante,
        reincidente, anos_com_alerta_irregular, defasagem_media_dias,
        atualizado_em)
     VALUES ${values}
     ON CONFLICT (municipio, ano) DO UPDATE SET
       bioma = EXCLUDED.bioma,
       ha_total = EXCLUDED.ha_total,
       ha_irregular = EXCLUDED.ha_irregular,
       ha_autorizado_total = EXCLUDED.ha_autorizado_total,
       ha_regularizado = EXCLUDED.ha_regularizado,
       pct_irregular = EXCLUDED.pct_irregular,
       num_alertas = EXCLUDED.num_alertas,
       vpressao_dominante = EXCLUDED.vpressao_dominante,
       reincidente = EXCLUDED.reincidente,
       anos_com_alerta_irregular = EXCLUDED.anos_com_alerta_irregular,
       defasagem_media_dias = EXCLUDED.defasagem_media_dias,
       atualizado_em = now()`,
  );
}
