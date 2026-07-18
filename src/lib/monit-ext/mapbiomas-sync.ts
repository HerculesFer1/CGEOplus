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
import {
  callPostgrestRpc,
  fetchPostgrest,
  fetchStaticJson,
} from "./upstream-client";

/* ==========================================================================
   Shapes upstream (documentam o que esperamos ler)
   ========================================================================== */

/**
 * Linha da RPC `get_resumo_anual` — FONTE AUTORITATIVA da série anual, a mesma
 * que a dashboard de referência usa (áreas computadas ao vivo da geometria).
 * Substitui o antigo `resumo_estatico.json`, que estava defasado e subnotificava
 * a área em 2-6× (ver docs/metodologia/01-mapbiomas.md).
 */
interface ResumoAnualRow {
  ano: number;
  n_alertas: number;
  ha_total: number | string;
  ha_irregular: number | string;
  ha_autorizado_total: number | string;
  ha_regularizado: number | string;
  ipi: number | string;
}

/** Formato upstream: `{ "2025": [ha_jan, ha_fev, ..., ha_dez] }` — só área,
 *  sem contagem (o pipeline upstream não expõe count mensal). */
type MonthlyAlertas = Record<string, number[]>;

interface AgregadoMunicipioRow {
  municipio: string;
  ano: number;
  bioma_predominante: string | null;
  ha_irregular: number | string;
  /** Autorizado PLENO — ASV cobre ≥ 99% do polígono. */
  ha_autorizado: number | string;
  /** Autorizado PARCIAL — ASV cobre só parte do polígono (o resto segue irregular). */
  ha_autorizado_parcialmente: number | string;
  /** Pleno + parcial. */
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

/** Mapeia as linhas da RPC autoritativa para o shape do snapshot anual.
 *
 *  A RPC só expõe o autorizado **total** (funde pleno + parcial). O split
 *  pleno/parcial existe no `agregado_municipios` (`ha_autorizado` vs
 *  `ha_autorizado_parcialmente`), mas numa escala diferente (deduplicada por
 *  município) da RPC (geometria bruta). Para não misturar escalas na mesma
 *  fatia da composição, aplicamos ao total autoritativo da RPC a **proporção
 *  de parcial** derivada do agregado municipal daquele ano — pleno + parcial
 *  continuam somando exatamente o `ha_autorizado_total` da RPC.
 *
 *  O split por bioma também vem do agregado municipal (a RPC não expõe bioma). */
function parseAnoFromRpc(
  rows: ResumoAnualRow[],
  biomaPorAno: Map<number, { cerrado: number; caatinga: number }>,
  splitPorAno: Map<number, { pleno: number; parcial: number; total: number }>,
) {
  return rows
    .filter((r) => Number.isFinite(Number(r.ano)))
    .map((r) => {
      const ano = Number(r.ano);
      const bioma = biomaPorAno.get(ano) ?? { cerrado: 0, caatinga: 0 };
      const split = splitPorAno.get(ano) ?? { pleno: 0, parcial: 0, total: 0 };
      const autorizadoTotal = Number(r.ha_autorizado_total) || 0;
      // Proporção de "parcial" dentro do autorizado, medida no agregado
      // municipal; aplicada ao total autoritativo da RPC.
      const fracParcial = split.total > 0 ? split.parcial / split.total : 0;
      const parcial = autorizadoTotal * fracParcial;
      const pleno = autorizadoTotal - parcial;
      return {
        ano,
        nAlertas: r.n_alertas ?? 0,
        areaTotalHa: n(r.ha_total),
        areaIrregularHa: n(r.ha_irregular),
        areaAutorizadoHa: n(pleno),
        areaAutorizadoParcialHa: n(parcial),
        areaRegularizadoHa: n(r.ha_regularizado),
        cerradoHa: n(bioma.cerrado),
        caatingaHa: n(bioma.caatinga),
        ipiPct: n(r.ipi),
      };
    });
}

/** Soma pleno/parcial/total do autorizado por ano a partir do agregado
 *  municipal — fonte do split que a RPC anual não expõe. */
function derivarAutorizadoSplitPorAno(
  rows: AgregadoMunicipioRow[],
): Map<number, { pleno: number; parcial: number; total: number }> {
  const map = new Map<number, { pleno: number; parcial: number; total: number }>();
  for (const r of rows) {
    const acc = map.get(r.ano) ?? { pleno: 0, parcial: 0, total: 0 };
    acc.pleno += Number(r.ha_autorizado) || 0;
    acc.parcial += Number(r.ha_autorizado_parcialmente) || 0;
    acc.total += Number(r.ha_autorizado_total) || 0;
    map.set(r.ano, acc);
  }
  return map;
}

/** Deriva a área por bioma (Cerrado/Caatinga) somando o agregado municipal por
 *  `bioma_predominante`. Dado geoespacial vivo, usado porque a RPC anual não
 *  expõe o split de bioma. */
function derivarBiomaPorAno(
  rows: AgregadoMunicipioRow[],
): Map<number, { cerrado: number; caatinga: number }> {
  const map = new Map<number, { cerrado: number; caatinga: number }>();
  for (const r of rows) {
    const bioma = (r.bioma_predominante ?? "").toLowerCase();
    const acc = map.get(r.ano) ?? { cerrado: 0, caatinga: 0 };
    const ha = Number(r.ha_total) || 0;
    if (bioma.includes("cerrado")) acc.cerrado += ha;
    else if (bioma.includes("caatinga")) acc.caatinga += ha;
    map.set(r.ano, acc);
  }
  return map;
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
  const [monthly, municipiosUpstream] = await Promise.all([
    fetchStaticJson<MonthlyAlertas>("monthly_alertas"),
    fetchPostgrest<AgregadoMunicipioRow>("agregado_municipios", {
      // Nunca puxamos matopiba: será tratado como módulo próprio depois.
      select:
        "municipio,ano,bioma_predominante,ha_irregular,ha_autorizado," +
        "ha_autorizado_parcialmente,ha_autorizado_total," +
        "ha_regularizado,ha_total,pct_irregular,num_alertas," +
        "vpressao_dominante_ptbr,reincidente,anos_com_alerta_irregular," +
        "defasagem_media_dias",
      order: "ano.desc,ha_irregular.desc",
    }),
  ]);

  // Série anual AUTORITATIVA: RPC ao vivo `get_resumo_anual` (mesma da dashboard
  // de referência; áreas computadas da geometria). A RPC é pesada e pode dar
  // statement timeout em cold start → retry + timeout folgado. Se falhar de vez,
  // caímos para a derivação municipal (dado vivo, internamente consistente) —
  // NUNCA para o `resumo_estatico.json`, que estava defasado.
  let resumoAnual: ResumoAnualRow[] = [];
  let fonteAnual = "get_resumo_anual (rpc)";
  try {
    resumoAnual = await callPostgrestRpc<ResumoAnualRow[]>(
      "get_resumo_anual",
      {},
      { timeoutMs: 45_000, retries: 4 },
    );
  } catch (err) {
    console.warn(
      "[mapbiomas-sync] get_resumo_anual indisponível — derivando a série anual do agregado municipal:",
      err instanceof Error ? err.message : err,
    );
    fonteAnual = "agregado_municipios (fallback)";
  }

  const biomaPorAno = derivarBiomaPorAno(municipiosUpstream);
  const splitPorAno = derivarAutorizadoSplitPorAno(municipiosUpstream);
  const anos = parseAnoFromRpc(resumoAnual, biomaPorAno, splitPorAno);
  const meses = parseMensal(monthly);
  const municipios = parseMunicipios(municipiosUpstream);

  // Salvaguarda de robustez: anos presentes no agregado municipal mas ausentes
  // da RPC — ou TODA a série, se a RPC falhou — são derivados somando os
  // municípios. Garante que a atualização nunca deixe um ano de fora nem quebre.
  const anosNaRpc = new Set(anos.map((a) => a.ano));
  const anosFaltando = new Map<number, AgregadoMunicipioRow[]>();
  for (const r of municipiosUpstream) {
    if (anosNaRpc.has(r.ano)) continue;
    const arr = anosFaltando.get(r.ano) ?? [];
    arr.push(r);
    anosFaltando.set(r.ano, arr);
  }
  for (const [ano, rows] of anosFaltando) {
    const bioma = biomaPorAno.get(ano) ?? { cerrado: 0, caatinga: 0 };
    const agg = rows.reduce(
      (a, r) => {
        a.nAlertas += r.num_alertas;
        a.areaTotalHa += Number(r.ha_total) || 0;
        a.areaIrregularHa += Number(r.ha_irregular) || 0;
        // Este path já está na escala municipal, então usamos o split exato
        // (pleno vs parcial) direto — sem proporção.
        a.areaAutorizadoHa += Number(r.ha_autorizado) || 0;
        a.areaAutorizadoParcialHa += Number(r.ha_autorizado_parcialmente) || 0;
        a.areaRegularizadoHa += Number(r.ha_regularizado) || 0;
        return a;
      },
      {
        nAlertas: 0,
        areaTotalHa: 0,
        areaIrregularHa: 0,
        areaAutorizadoHa: 0,
        areaAutorizadoParcialHa: 0,
        areaRegularizadoHa: 0,
      },
    );
    anos.push({
      ano,
      nAlertas: agg.nAlertas,
      areaTotalHa: n(agg.areaTotalHa),
      areaIrregularHa: n(agg.areaIrregularHa),
      areaAutorizadoHa: n(agg.areaAutorizadoHa),
      areaAutorizadoParcialHa: n(agg.areaAutorizadoParcialHa),
      areaRegularizadoHa: n(agg.areaRegularizadoHa),
      cerradoHa: n(bioma.cerrado),
      caatingaHa: n(bioma.caatinga),
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
    fonteUrl: `${fonteAnual} + agregado_municipios + ${UPSTREAM_VERCEL}/data/monthly_alertas.json`,
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
