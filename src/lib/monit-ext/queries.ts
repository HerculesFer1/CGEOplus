/**
 * Queries de leitura do módulo Monitoramento Externo.
 *
 * Rodam via Drizzle (role postgres bypassa RLS). Cada função devolve o shape
 * exato consumido por uma view — sem re-agregações no cliente. Todas as
 * queries são `SELECT` puros sobre snapshot já materializado pelo cron.
 */

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  monitExtExecucao,
  monitExtMapbiomasAno,
  monitExtMapbiomasMensal,
  monitExtMapbiomasMunicipio,
  monitExtProdesCiclo,
  monitExtProdesCobertura,
  monitExtProdesMunicipio,
  monitExtProdesVetor,
  monitExtQueimadasAno,
  monitExtQueimadasMunicipioAno,
  monitExtQueimadasMunicipioMesClasse,
} from "@/lib/db/monitoramento-externo";

/* ==========================================================================
   AUDITORIA / TIMELINE DE BASES
   ========================================================================== */

export type FonteExt = "mapbiomas" | "prodes" | "queimadas";

/** Última execução de cada fonte — alimenta a Timeline de Bases. */
export async function getUltimasExecucoes(): Promise<
  Array<{
    fonte: FonteExt;
    executadoEm: Date | null;
    status: string | null;
    registrosInseridos: number | null;
  }>
> {
  const rows = await db
    .select({
      fonte: monitExtExecucao.fonte,
      executadoEm: sql<Date>`MAX(${monitExtExecucao.executadoEm})`,
      status: sql<string>`(SELECT status FROM monit_ext_execucao e2
        WHERE e2.fonte = monit_ext_execucao.fonte
        ORDER BY e2.executado_em DESC LIMIT 1)`,
      registrosInseridos: sql<number>`(SELECT registros_inseridos FROM monit_ext_execucao e3
        WHERE e3.fonte = monit_ext_execucao.fonte
        ORDER BY e3.executado_em DESC LIMIT 1)`,
    })
    .from(monitExtExecucao)
    .groupBy(monitExtExecucao.fonte);

  return rows.map((r) => ({
    fonte: r.fonte as FonteExt,
    executadoEm: r.executadoEm,
    status: r.status,
    registrosInseridos: r.registrosInseridos,
  }));
}

/* ==========================================================================
   MAPBIOMAS
   ========================================================================== */

export async function getMapbiomasSerieAnual() {
  return db
    .select()
    .from(monitExtMapbiomasAno)
    .orderBy(monitExtMapbiomasAno.ano);
}

export async function getMapbiomasSerieMensal() {
  return db
    .select()
    .from(monitExtMapbiomasMensal)
    .orderBy(monitExtMapbiomasMensal.ano, monitExtMapbiomasMensal.mes);
}

/**
 * Top N municípios de um ano específico por ha_irregular. Se `ano` for null,
 * usa o ano mais recente ingerido. Retorna sempre o ano usado para que
 * caller possa exibir na UI sem consultas extras.
 */
export async function getMapbiomasTopMunicipios(
  ano: number | null,
  limite = 20,
) {
  let anoUsado = ano;
  if (anoUsado === null) {
    const [ultimo] = await db
      .select({ ano: sql<number>`MAX(${monitExtMapbiomasMunicipio.ano})` })
      .from(monitExtMapbiomasMunicipio);
    anoUsado = ultimo?.ano ?? null;
  }
  if (anoUsado === null) return { ano: null, rows: [] as MunicipioMapbiomas[] };
  const rows = await db
    .select()
    .from(monitExtMapbiomasMunicipio)
    .where(eq(monitExtMapbiomasMunicipio.ano, anoUsado))
    .orderBy(desc(monitExtMapbiomasMunicipio.haIrregular))
    .limit(limite);
  return { ano: anoUsado, rows };
}

/** Snapshot completo por município do ano mais recente — alimenta choropleth. */
export async function getMapbiomasMunicipiosAno(ano: number) {
  return db
    .select()
    .from(monitExtMapbiomasMunicipio)
    .where(eq(monitExtMapbiomasMunicipio.ano, ano));
}

/**
 * Snapshot agregado por município somando TODOS os anos — alimenta o
 * choropleth e o ranking no modo "Todos os anos". Antes o modo agregado
 * resolvia para o último ano, deixando o mapa em desacordo com os KPIs (que
 * somam a série inteira). Aqui as áreas são somadas por município; o IPI/pct
 * é recalculado sobre os totais e os campos derivados (bioma/vetor dominante,
 * reincidência) são consolidados no período.
 */
export async function getMapbiomasMunicipiosAgregado(): Promise<
  MunicipioMapbiomas[]
> {
  const m = monitExtMapbiomasMunicipio;
  const rows = await db
    .select({
      municipio: m.municipio,
      ano: sql<number>`MAX(${m.ano})`,
      bioma: sql<string | null>`MODE() WITHIN GROUP (ORDER BY ${m.bioma})`,
      haTotal: sql<string>`SUM(${m.haTotal})`,
      haIrregular: sql<string>`SUM(${m.haIrregular})`,
      haAutorizadoTotal: sql<string>`SUM(${m.haAutorizadoTotal})`,
      haRegularizado: sql<string>`SUM(${m.haRegularizado})`,
      pctIrregular: sql<string>`CASE WHEN SUM(${m.haTotal}) > 0 THEN ROUND(SUM(${m.haIrregular}) / SUM(${m.haTotal}) * 100, 2) ELSE 0 END`,
      numAlertas: sql<number>`SUM(${m.numAlertas})`,
      vpressaoDominante: sql<
        string | null
      >`MODE() WITHIN GROUP (ORDER BY ${m.vpressaoDominante})`,
      reincidente: sql<
        boolean
      >`COUNT(DISTINCT ${m.ano}) FILTER (WHERE ${m.haIrregular} > 0) >= 2`,
      anosComAlertaIrregular: sql<
        number[]
      >`COALESCE(ARRAY_AGG(DISTINCT ${m.ano}) FILTER (WHERE ${m.haIrregular} > 0), ARRAY[]::smallint[])`,
      defasagemMediaDias: sql<string | null>`AVG(${m.defasagemMediaDias})`,
      atualizadoEm: sql<Date>`MAX(${m.atualizadoEm})`,
    })
    .from(m)
    .groupBy(m.municipio);
  return rows as MunicipioMapbiomas[];
}

export type MunicipioMapbiomas =
  typeof monitExtMapbiomasMunicipio.$inferSelect;

/* ==========================================================================
   PRODES
   ========================================================================== */

export async function getProdesCiclos() {
  return db
    .select()
    .from(monitExtProdesCiclo)
    .orderBy(monitExtProdesCiclo.anoProdesRef);
}

export async function getProdesTopMunicipios() {
  return db
    .select()
    .from(monitExtProdesMunicipio)
    .orderBy(desc(monitExtProdesMunicipio.totalHa));
}

export async function getProdesVetorPressao() {
  return db
    .select()
    .from(monitExtProdesVetor)
    .orderBy(desc(monitExtProdesVetor.nAlertas));
}

export async function getProdesCobertura() {
  return db
    .select()
    .from(monitExtProdesCobertura)
    .orderBy(monitExtProdesCobertura.ordem);
}

/* ==========================================================================
   QUEIMADAS
   ========================================================================== */

export async function getQueimadasSerieAnual() {
  return db.select().from(monitExtQueimadasAno).orderBy(monitExtQueimadasAno.ano);
}

export async function getQueimadasTopMunicipios(ano: number, limite = 20) {
  return db
    .select()
    .from(monitExtQueimadasMunicipioAno)
    .where(eq(monitExtQueimadasMunicipioAno.ano, ano))
    .orderBy(desc(monitExtQueimadasMunicipioAno.areaQueimadaTotalHa))
    .limit(limite);
}

/** Municípios em alerta CGEO+ (classe AHP 4-5 + >50% em área prioritária). */
export async function getQueimadasMunicipiosEmAlerta(ano: number) {
  return db
    .select()
    .from(monitExtQueimadasMunicipioAno)
    .where(
      and(
        eq(monitExtQueimadasMunicipioAno.ano, ano),
        eq(monitExtQueimadasMunicipioAno.emAlerta, true),
      ),
    )
    .orderBy(desc(monitExtQueimadasMunicipioAno.areaQueimadaTotalHa));
}

export async function getQueimadasMunicipiosAno(ano: number) {
  return db
    .select()
    .from(monitExtQueimadasMunicipioAno)
    .where(eq(monitExtQueimadasMunicipioAno.ano, ano));
}

/**
 * Agregado por município somando TODOS os anos — alimenta o choropleth e o
 * ranking no modo "Todos os anos". A área queimada é somada; a classe AHP
 * máxima é o pico do período; o % em área prioritária vira média ponderada
 * pela área; `emAlerta` é verdadeiro se o município disparou o critério em
 * qualquer ano.
 */
export async function getQueimadasMunicipiosAgregado() {
  const q = monitExtQueimadasMunicipioAno;
  return db
    .select({
      municipioCod: q.municipioCod,
      municipioNome: sql<string>`MAX(${q.municipioNome})`,
      ano: sql<number>`MAX(${q.ano})`,
      areaQueimadaTotalHa: sql<string>`SUM(${q.areaQueimadaTotalHa})`,
      nCicatrizesTotal: sql<number>`SUM(${q.nCicatrizesTotal})`,
      classeMaxQueimada: sql<number | null>`MAX(${q.classeMaxQueimada})`,
      pctAreaPrioritaria: sql<
        string | null
      >`CASE WHEN SUM(${q.areaQueimadaTotalHa}) > 0 THEN ROUND(SUM(${q.areaQueimadaTotalHa} * COALESCE(${q.pctAreaPrioritaria}, 0)) / SUM(${q.areaQueimadaTotalHa}), 2) ELSE NULL END`,
      mesPico: sql<number | null>`MODE() WITHIN GROUP (ORDER BY ${q.mesPico})`,
      emAlerta: sql<boolean | null>`BOOL_OR(${q.emAlerta})`,
      atualizadoEm: sql<Date>`MAX(${q.atualizadoEm})`,
    })
    .from(q)
    .groupBy(q.municipioCod);
}

/** Sazonalidade mensal por classe AHP — para o gráfico "Por Classe". */
export async function getQueimadasSazonalidadePorClasse(ano: number) {
  const rows = await db
    .select({
      mes: monitExtQueimadasMunicipioMesClasse.mes,
      classePrioridade: monitExtQueimadasMunicipioMesClasse.classePrioridade,
      areaHa: sql<string>`SUM(${monitExtQueimadasMunicipioMesClasse.areaQueimadaHa})`,
      nCicatrizes: sql<number>`SUM(${monitExtQueimadasMunicipioMesClasse.nCicatrizes})`,
    })
    .from(monitExtQueimadasMunicipioMesClasse)
    .where(eq(monitExtQueimadasMunicipioMesClasse.ano, ano))
    .groupBy(
      monitExtQueimadasMunicipioMesClasse.mes,
      monitExtQueimadasMunicipioMesClasse.classePrioridade,
    );
  return rows;
}

/** Recorrência: municípios com pressão crítica em ≥ N anos. */
export async function getQueimadasRecorrentes() {
  const rows = await db
    .select({
      municipioCod: monitExtQueimadasMunicipioAno.municipioCod,
      municipioNome: monitExtQueimadasMunicipioAno.municipioNome,
      anosCriticos: sql<number>`COUNT(*) FILTER (WHERE em_alerta)`,
      totalAnos: sql<number>`COUNT(*)`,
      areaTotalHa: sql<string>`SUM(${monitExtQueimadasMunicipioAno.areaQueimadaTotalHa})`,
    })
    .from(monitExtQueimadasMunicipioAno)
    .groupBy(
      monitExtQueimadasMunicipioAno.municipioCod,
      monitExtQueimadasMunicipioAno.municipioNome,
    )
    .having(sql`COUNT(*) FILTER (WHERE em_alerta) >= 2`)
    .orderBy(desc(sql`COUNT(*) FILTER (WHERE em_alerta)`), desc(sql`SUM(area_queimada_total_ha)`));
  return rows;
}
