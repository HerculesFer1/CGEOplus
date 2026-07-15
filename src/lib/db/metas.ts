/**
 * CGEO+ Módulo Metas — cadastro de metas mensais/semanais.
 *
 * Escopo polimórfico: institucional | núcleo | servidor | sistema | atividade.
 * `alvoId` é FK "manual" (aponta para servidores/nucleos/atividades conforme
 * escopo); `alvoSistema` é usado quando escopo = 'sistema' (enum, não FK).
 *
 * Progresso é sempre calculado em tempo real via query em `analises` no
 * `metas.service.ts` — não existe tabela auxiliar de "realizado".
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  smallint,
  numeric,
  pgEnum,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { servidores } from "./schema";

/**
 * Espelho local do `sistema` enum declarado em `schema.ts`. Necessário porque
 * `schema.ts` faz `export * from "./metas"` — importar o enum de lá cria um
 * ciclo TDZ (o `pgEnum(...)` só é executado quando schema.ts termina, mas
 * este módulo é avaliado no meio). `pgEnum` não emite DDL — é apenas uma
 * referência tipada ao tipo Postgres já existente, então declarar com o
 * mesmo nome e valores é seguro. Valores devem ficar em sync com o schema.
 */
const sistemaEnum = pgEnum("sistema", ["SEI", "SIGA", "SICAR", "SINAFLOR"]);

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const metaPeriodoEnum = pgEnum("meta_periodo", ["mensal", "semanal"]);

export const metaEscopoEnum = pgEnum("meta_escopo", [
  "institucional",
  "nucleo",
  "servidor",
  "sistema",
  "atividade",
]);

export const metaMetricaEnum = pgEnum("meta_metrica", [
  "analises_registradas",
  "analises_finalizadas",
  "taxa_finalizacao",
  "processos_concluidos",
]);

/* ==========================================================================
   TABELA
   ========================================================================== */

export const metas = pgTable(
  "metas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    periodo: metaPeriodoEnum("periodo").notNull(),
    escopo: metaEscopoEnum("escopo").notNull(),
    alvoId: uuid("alvo_id"),
    alvoSistema: sistemaEnum("alvo_sistema"),
    metrica: metaMetricaEnum("metrica").notNull(),
    valorAlvo: numeric("valor_alvo", { precision: 10, scale: 2 }).notNull(),
    ano: smallint("ano").notNull(),
    mes: smallint("mes"),
    semanaIso: smallint("semana_iso"),
    observacao: text("observacao"),
    criadoPor: uuid("criado_por").references(() => servidores.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ix_metas_periodo").on(t.periodo, t.ano, t.mes, t.semanaIso),
    index("ix_metas_escopo_alvo").on(t.escopo, t.alvoId),
    // Os partial unique indexes (ux_metas_dedup_*) existem só no banco —
    // ver drizzle/migrations/0005_add_metas.sql. Drizzle não precisa saber
    // deles para queries funcionarem.
    check(
      "chk_metas_periodo_campos",
      sql`(${t.periodo} = 'mensal' AND ${t.mes} BETWEEN 1 AND 12 AND ${t.semanaIso} IS NULL)
        OR (${t.periodo} = 'semanal' AND ${t.semanaIso} BETWEEN 1 AND 53 AND ${t.mes} IS NULL)`,
    ),
    check(
      "chk_metas_escopo_alvo",
      sql`(${t.escopo} = 'institucional' AND ${t.alvoId} IS NULL AND ${t.alvoSistema} IS NULL)
        OR (${t.escopo} IN ('nucleo', 'servidor', 'atividade') AND ${t.alvoId} IS NOT NULL AND ${t.alvoSistema} IS NULL)
        OR (${t.escopo} = 'sistema' AND ${t.alvoSistema} IS NOT NULL AND ${t.alvoId} IS NULL)`,
    ),
    check("chk_metas_valor_positivo", sql`${t.valorAlvo} > 0`),
    check(
      "chk_metas_taxa_max",
      sql`${t.metrica} <> 'taxa_finalizacao' OR ${t.valorAlvo} <= 100`,
    ),
    check("chk_metas_ano", sql`${t.ano} BETWEEN 2020 AND 2100`),
  ],
);
