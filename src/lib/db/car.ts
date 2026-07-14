/**
 * CGEO+ Módulo CAR — Análise de Passivo do Cadastro Ambiental Rural
 *
 * Modela a importação mensal do relatório do SICAR-PI:
 *   - Mapa persistente Fase do Processo → Bucket agregado (Ag.Gestor, Pendente,
 *     Validado, Cancelado, Suspenso). Novas fases detectadas na importação
 *     são resolvidas no modal e persistidas aqui — o mapa aprende.
 *   - Importações (1 por mês/ano, com resumo pré-agregado em JSON para o dashboard).
 *   - Registros crus (~334k linhas/mês) para permitir drill-down por município.
 *   - Ranking nacional por UF (mensal, input separado do CSV existente).
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  smallint,
  pgEnum,
  uniqueIndex,
  index,
  jsonb,
  char,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { servidores } from "./schema";

/* ==========================================================================
   ENUMS
   ========================================================================== */

/** Bucket agregado do dashboard. NAO_CLASSIFICADO é fallback quando uma fase
 *  nova do SICAR ainda não foi resolvida no mapa. */
export const carBucketEnum = pgEnum("car_bucket", [
  "AG_GESTOR",
  "PENDENTE",
  "VALIDADO",
  "CANCELADO",
  "SUSPENSO",
  "NAO_CLASSIFICADO",
]);

/** Coluna "Situação do Imóvel" do CSV. Valores exatos do SICAR (Title Case). */
export const carSituacaoEnum = pgEnum("car_situacao", [
  "Ativo",
  "Cancelado",
  "Pendente",
  "Retificado",
  "Suspenso",
]);

/** Status da importação. `parcial` = tem fases não classificadas persistidas. */
export const carImportStatusEnum = pgEnum("car_import_status", [
  "processando",
  "concluida",
  "parcial",
  "falhou",
]);

/** Origem da entrada do mapa Fase→Bucket. `seed` = criada na migration inicial. */
export const carMapOrigemEnum = pgEnum("car_map_origem", [
  "seed",
  "manual",
  "auto",
]);

/* ==========================================================================
   TABELAS
   ========================================================================== */

/** Mapa persistente Fase do Processo (texto exato do SICAR) → Bucket agregado.
 *  Quando o modal de importação classifica uma fase nova, grava aqui — a próxima
 *  importação já reconhece. */
export const carFaseBucketMap = pgTable(
  "car_fase_bucket_map",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    faseOriginal: text("fase_original").notNull().unique(),
    bucket: carBucketEnum("bucket").notNull(),
    observacao: text("observacao"),
    origem: carMapOrigemEnum("origem").notNull().default("seed"),
    criadoPor: uuid("criado_por").references(() => servidores.id),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ix_car_map_bucket").on(t.bucket),
  ],
);

/** Uma linha por importação de planilha do SICAR. */
export const carImportacao = pgTable(
  "car_importacao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ano: integer("ano").notNull(),
    mes: smallint("mes").notNull(),
    arquivoOriginal: text("arquivo_original"),
    arquivoChecksum: text("arquivo_checksum"),
    totalRegistros: integer("total_registros").notNull(),
    importadoPor: uuid("importado_por").references(() => servidores.id),
    importadoEm: timestamp("importado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: carImportStatusEnum("status").notNull().default("concluida"),
    /** Pré-agregado para o dashboard (topline sem varrer car_registro):
     *  { ag_gestor, pendente, validado, cancelado, suspenso, nao_classificado,
     *    por_situacao: {...}, por_municipio: {...}, fases_novas: [...] } */
    resumo: jsonb("resumo"),
  },
  (t) => [
    uniqueIndex("ux_car_importacao_ano_mes").on(t.ano, t.mes),
    check(
      "chk_car_mes_valido",
      sql`${t.mes} BETWEEN 1 AND 12`,
    ),
  ],
);

/** Registros brutos da planilha (~334k por importação).
 *  Permite drill-down por município e cruzamento Situação × Fase.
 *  ON DELETE CASCADE: apagar `car_importacao` limpa tudo. */
export const carRegistro = pgTable(
  "car_registro",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    importId: uuid("import_id")
      .notNull()
      .references(() => carImportacao.id, { onDelete: "cascade" }),
    numeroRecibo: text("numero_recibo").notNull(),
    municipio: text("municipio").notNull(),
    situacao: carSituacaoEnum("situacao").notNull(),
    faseOriginal: text("fase_original").notNull(),
    bucket: carBucketEnum("bucket").notNull(),
  },
  (t) => [
    index("ix_car_registro_import").on(t.importId),
    index("ix_car_registro_import_municipio").on(t.importId, t.municipio),
    index("ix_car_registro_import_bucket").on(t.importId, t.bucket),
    index("ix_car_registro_import_situacao").on(t.importId, t.situacao),
  ],
);

/** Ranking nacional por UF (para o gráfico de benchmarking).
 *  Alimentado pela planilha `UF · Total do Tema`. Um "tema" identifica o
 *  recorte (ex.: `regularidade_ambiental_concluida`) — permite adicionar
 *  outros temas depois sem quebrar o histórico. */
export const carUfRanking = pgTable(
  "car_uf_ranking",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ano: integer("ano").notNull(),
    mes: smallint("mes").notNull(),
    uf: char("uf", { length: 2 }).notNull(),
    total: integer("total").notNull(),
    temaSlug: text("tema_slug").notNull(),
    temaRotulo: text("tema_rotulo").notNull(),
  },
  (t) => [
    uniqueIndex("ux_car_uf_ranking_ano_mes_uf").on(t.ano, t.mes, t.uf),
    check(
      "chk_car_uf_mes_valido",
      sql`${t.mes} BETWEEN 1 AND 12`,
    ),
  ],
);

/** Granularidade do período em `car_serie_historica`. */
export const carSerieGranularidadeEnum = pgEnum("car_serie_granularidade", [
  "anual",
  "mensal",
]);

/** Origem da linha da série (auditoria). */
export const carSerieOrigemEnum = pgEnum("car_serie_origem", [
  "seed",
  "sync_importacao",
  "manual",
]);

/** Série histórica agregada — 1 linha por período (ano ou mês).
 *  Independe de `car_importacao` (que só cobre meses com CSV importado).
 *  Alimenta a seção Evolução Temporal e o Diagnóstico do painel /car. */
export const carSerieHistorica = pgTable(
  "car_serie_historica",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    periodoLabel: text("periodo_label").notNull().unique(),
    /** Chave ordenável estável: 202200 (ano) ou 202607 (Jul/26). */
    periodoOrdem: integer("periodo_ordem").notNull().unique(),
    granularidade: carSerieGranularidadeEnum("granularidade").notNull(),
    agGestor: integer("ag_gestor").notNull().default(0),
    pendentes: integer("pendentes").notNull().default(0),
    validados: integer("validados").notNull().default(0),
    cancelados: integer("cancelados").notNull().default(0),
    suspensos: integer("suspensos").notNull().default(0),
    total: integer("total").notNull().default(0),
    origem: carSerieOrigemEnum("origem").notNull().default("seed"),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ix_car_serie_historica_ordem").on(t.periodoOrdem),
  ],
);

/** Chave-valor para config do módulo CAR (baseline, thresholds). */
export const carConfig = pgTable("car_config", {
  chave: text("chave").primaryKey(),
  valor: jsonb("valor").notNull(),
  descricao: text("descricao"),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ==========================================================================
   RELATIONS
   ========================================================================== */

export const carImportacaoRelations = relations(carImportacao, ({ many, one }) => ({
  registros: many(carRegistro),
  importadoPorServidor: one(servidores, {
    fields: [carImportacao.importadoPor],
    references: [servidores.id],
  }),
}));

export const carRegistroRelations = relations(carRegistro, ({ one }) => ({
  importacao: one(carImportacao, {
    fields: [carRegistro.importId],
    references: [carImportacao.id],
  }),
}));

export const carFaseBucketMapRelations = relations(carFaseBucketMap, ({ one }) => ({
  criadoPorServidor: one(servidores, {
    fields: [carFaseBucketMap.criadoPor],
    references: [servidores.id],
  }),
}));
