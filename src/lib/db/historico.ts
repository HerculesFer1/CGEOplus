/**
 * CGEO+ Histórico Temporal (SCD Type 2)
 *
 * Cada mutação em `nucleos` ou `atividades` é registrada aqui por trigger
 * Postgres (`trg_audit_nucleos`, `trg_audit_atividades`), com snapshot completo
 * + `validFrom` / `validTo`. A versão atual de cada linha viva tem `validTo`
 * = null; versões anteriores têm timestamp de quando foram substituídas.
 *
 * Migração: `nucleos_atividades_historico_scd2` (Supabase, 2026-07-15).
 *
 * Consulta típica — "config do núcleo X em 2026-05-10":
 *   SELECT * FROM nucleos_historico
 *   WHERE id = $1 AND valid_from <= '2026-05-10' AND (valid_to IS NULL OR valid_to > '2026-05-10');
 */

import { pgTable, uuid, text, boolean, timestamp, smallint, index } from "drizzle-orm/pg-core";

export const nucleosHistorico = pgTable(
  "nucleos_historico",
  {
    histId: uuid("hist_id").primaryKey().defaultRandom(),
    id: uuid("id").notNull(),
    nome: text("nome").notNull(),
    descricao: text("descricao"),
    corTema: text("cor_tema"),
    minMembros: smallint("min_membros").notNull(),
    ativo: boolean("ativo").notNull(),
    action: text("action").notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
    validTo: timestamp("valid_to", { withTimezone: true }),
    changedBy: uuid("changed_by"),
  },
  (t) => [index("ix_nucleos_historico_id_valid_from").on(t.id, t.validFrom)],
);

export const atividadesHistorico = pgTable(
  "atividades_historico",
  {
    histId: uuid("hist_id").primaryKey().defaultRandom(),
    id: uuid("id").notNull(),
    nome: text("nome").notNull(),
    complexidade: text("complexidade").notNull(),
    nucleoId: uuid("nucleo_id"),
    descricao: text("descricao"),
    ativo: boolean("ativo").notNull(),
    action: text("action").notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
    validTo: timestamp("valid_to", { withTimezone: true }),
    changedBy: uuid("changed_by"),
  },
  (t) => [index("ix_atividades_historico_id_valid_from").on(t.id, t.validFrom)],
);

export type NucleoHistorico = typeof nucleosHistorico.$inferSelect;
export type AtividadeHistorico = typeof atividadesHistorico.$inferSelect;
