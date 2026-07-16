/**
 * CGEO+ Módulo Monitoramento Externo — MapBiomas Alertas · PRODES-Cerrado · Queimadas BDQ
 *
 * Snapshot institucional dos 3 monitoramentos de pressão ambiental federal,
 * sincronizado por cron da fonte upstream (repo/Supabase de desmatamento-pi).
 * A fonte da verdade continua no upstream — aqui vive um cache atualizado
 * para servir dashboards do CGEO+ com performance e independência de infra.
 *
 * Prefixo `monit_ext_` diferencia do módulo Monitoramento interno (Pilares II /
 * PSI). Todas as tabelas com RLS default-deny; queries vão via Drizzle
 * (role postgres bypassa RLS — segue padrão descrito em CLAUDE.md).
 *
 * Cadência de atualização:
 *   - mapbiomas → mensal (dia 6, após workflow upstream do dia 5)
 *   - prodes    → anual (2 de outubro, após ciclo INPE de 1 out)
 *   - queimadas → mensal (dia 15, após BDQ-INPE atualizar mês anterior)
 */

import {
  pgTable,
  bigserial,
  text,
  timestamp,
  integer,
  smallint,
  boolean,
  numeric,
  jsonb,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ==========================================================================
   AUDITORIA DE SINCRONIZAÇÕES
   ========================================================================== */

/** Uma linha por execução do cron por fonte. Serve a Timeline de Bases e
 *  ao card "próxima atualização prevista" do aparato geral. */
export const monitExtExecucao = pgTable(
  "monit_ext_execucao",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    fonte: text("fonte").notNull(),
    executadoEm: timestamp("executado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text("status").notNull(),
    registrosInseridos: integer("registros_inseridos").notNull().default(0),
    duracaoMs: integer("duracao_ms"),
    fonteUrl: text("fonte_url"),
    mensagem: text("mensagem"),
    detalhes: jsonb("detalhes"),
  },
  (t) => [
    index("idx_monit_ext_execucao_fonte_data").on(t.fonte, t.executadoEm.desc()),
    check(
      "chk_monit_ext_fonte",
      sql`${t.fonte} IN ('mapbiomas','prodes','queimadas')`,
    ),
    check(
      "chk_monit_ext_status",
      sql`${t.status} IN ('ok','parcial','erro')`,
    ),
  ],
);

/* ==========================================================================
   MAPBIOMAS ALERTAS
   ========================================================================== */

/** Série anual + IPI (Índice de Pressão Irregular). Uma linha por ano. */
export const monitExtMapbiomasAno = pgTable("monit_ext_mapbiomas_ano", {
  ano: smallint("ano").primaryKey(),
  nAlertas: integer("n_alertas").notNull(),
  areaTotalHa: numeric("area_total_ha", { precision: 14, scale: 2 }).notNull(),
  areaIrregularHa: numeric("area_irregular_ha", { precision: 14, scale: 2 }).notNull(),
  areaAutorizadoHa: numeric("area_autorizado_ha", { precision: 14, scale: 2 }).notNull().default("0"),
  areaAutorizadoParcialHa: numeric("area_autorizado_parcial_ha", { precision: 14, scale: 2 }).notNull().default("0"),
  areaRegularizadoHa: numeric("area_regularizado_ha", { precision: 14, scale: 2 }).notNull().default("0"),
  cerradoHa: numeric("cerrado_ha", { precision: 14, scale: 2 }).notNull().default("0"),
  caatingaHa: numeric("caatinga_ha", { precision: 14, scale: 2 }).notNull().default("0"),
  ipiPct: numeric("ipi_pct", { precision: 5, scale: 2 }).notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Sazonalidade mensal — pk (ano, mes). Alimenta heatmap e linha temporal. */
export const monitExtMapbiomasMensal = pgTable("monit_ext_mapbiomas_mensal", {
  ano: smallint("ano").notNull(),
  mes: smallint("mes").notNull(),
  nAlertas: integer("n_alertas").notNull().default(0),
  areaHa: numeric("area_ha", { precision: 14, scale: 2 }).notNull().default("0"),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Snapshot município × ano — coração do choropleth e ranking. */
export const monitExtMapbiomasMunicipio = pgTable(
  "monit_ext_mapbiomas_municipio",
  {
    municipio: text("municipio").notNull(),
    ano: smallint("ano").notNull(),
    bioma: text("bioma"),
    haTotal: numeric("ha_total", { precision: 14, scale: 2 }).notNull().default("0"),
    haIrregular: numeric("ha_irregular", { precision: 14, scale: 2 }).notNull().default("0"),
    haAutorizadoTotal: numeric("ha_autorizado_total", { precision: 14, scale: 2 }).notNull().default("0"),
    haRegularizado: numeric("ha_regularizado", { precision: 14, scale: 2 }).notNull().default("0"),
    pctIrregular: numeric("pct_irregular", { precision: 5, scale: 2 }).notNull().default("0"),
    numAlertas: integer("num_alertas").notNull().default(0),
    vpressaoDominante: text("vpressao_dominante"),
    reincidente: boolean("reincidente").notNull().default(false),
    anosComAlertaIrregular: smallint("anos_com_alerta_irregular").array().default(sql`'{}'`),
    defasagemMediaDias: numeric("defasagem_media_dias", { precision: 6, scale: 1 }),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
);

/* ==========================================================================
   PRODES-CERRADO
   ========================================================================== */

/** Ciclo PRODES (validação cruzada com MapBiomas). Uma linha por ano de referência. */
export const monitExtProdesCiclo = pgTable("monit_ext_prodes_ciclo", {
  anoProdesRef: smallint("ano_prodes_ref").primaryKey(),
  nTotal: integer("n_total").notNull(),
  nConcordantes: integer("n_concordantes").notNull(),
  nDiscordantes: integer("n_discordantes").notNull(),
  nSemProdes: integer("n_sem_prodes").notNull().default(0),
  pctConcordancia: numeric("pct_concordancia", { precision: 5, scale: 2 }),
  mediaCoberturaPct: numeric("media_cobertura_pct", { precision: 5, scale: 2 }),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Top municípios PRODES. */
export const monitExtProdesMunicipio = pgTable("monit_ext_prodes_municipio", {
  municipio: text("municipio").notNull(),
  ano: smallint("ano").notNull(),
  concordanteHa: numeric("concordante_ha", { precision: 14, scale: 2 }).notNull().default("0"),
  totalHa: numeric("total_ha", { precision: 14, scale: 2 }).notNull().default("0"),
  pctConcordancia: numeric("pct_concordancia", { precision: 5, scale: 2 }),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Vetor de pressão (Agricultura, Expansão Urbana, Mineração, ...). */
export const monitExtProdesVetor = pgTable("monit_ext_prodes_vetor", {
  vetor: text("vetor").primaryKey(),
  nAlertas: integer("n_alertas").notNull(),
  nConcordantes: integer("n_concordantes").notNull(),
  pctConcordancia: numeric("pct_concordancia", { precision: 5, scale: 2 }).notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Faixa de cobertura PRODES ('0%', '1-24%', '25-49%', '50-74%', '75-89%', '90-100%'). */
export const monitExtProdesCobertura = pgTable("monit_ext_prodes_cobertura", {
  faixa: text("faixa").primaryKey(),
  ordem: smallint("ordem").notNull(),
  nAlertas: integer("n_alertas").notNull(),
  areaHa: numeric("area_ha", { precision: 14, scale: 2 }).notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

/* ==========================================================================
   QUEIMADAS BDQ-INPE (AQ1km V6 Coleção 2)
   ========================================================================== */

/** Execução anual do pipeline INPE (totais estaduais). */
export const monitExtQueimadasAno = pgTable("monit_ext_queimadas_ano", {
  ano: smallint("ano").primaryKey(),
  nCicatrizes: integer("n_cicatrizes").notNull(),
  areaQueimadaHa: numeric("area_queimada_ha", { precision: 14, scale: 2 }).notNull(),
  nMunicipiosAfetados: smallint("n_municipios_afetados").notNull(),
  mesesComDados: text("meses_com_dados"),
  fonteDados: text("fonte_dados").notNull(),
  executadoEmOrigem: timestamp("executado_em_origem", { withTimezone: true }),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Município × ano — resumo com destaque de áreas prioritárias.
 *  `emAlerta` (GENERATED) sinaliza município em classe AHP 4-5 com >50% da
 *  área em zona prioritária — critério destacado no dashboard original. */
export const monitExtQueimadasMunicipioAno = pgTable(
  "monit_ext_queimadas_municipio_ano",
  {
    municipioCod: text("municipio_cod").notNull(),
    municipioNome: text("municipio_nome").notNull(),
    ano: smallint("ano").notNull(),
    areaQueimadaTotalHa: numeric("area_queimada_total_ha", { precision: 14, scale: 2 }).notNull().default("0"),
    nCicatrizesTotal: integer("n_cicatrizes_total").notNull().default(0),
    classeMaxQueimada: smallint("classe_max_queimada"),
    pctAreaPrioritaria: numeric("pct_area_prioritaria", { precision: 5, scale: 2 }),
    mesPico: smallint("mes_pico"),
    emAlerta: boolean("em_alerta"),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
);

/** Detalhe granular: município × ano × mês × classe AHP (1-5). ~19k linhas. */
export const monitExtQueimadasMunicipioMesClasse = pgTable(
  "monit_ext_queimadas_municipio_mes_classe",
  {
    municipioCod: text("municipio_cod").notNull(),
    ano: smallint("ano").notNull(),
    mes: smallint("mes").notNull(),
    classePrioridade: smallint("classe_prioridade").notNull(),
    prioridadeLabel: text("prioridade_label"),
    areaQueimadaHa: numeric("area_queimada_ha", { precision: 14, scale: 4 }).notNull(),
    nCicatrizes: integer("n_cicatrizes").notNull(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
);
