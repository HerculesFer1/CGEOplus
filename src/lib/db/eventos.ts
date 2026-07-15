/**
 * CGEO+ Módulo Eventos — agenda do setor com lembretes in-app.
 *
 * Sem recorrência: cada ocorrência é uma linha (decisão do usuário,
 * 2026-07-14). `lembretes_min` guarda minutos-antes; o sino do topbar
 * e a tela pós-login futura consultam qual lembrete está ativo agora.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { servidores, nucleos } from "./schema";

export const tipoEventoEnum = pgEnum("tipo_evento", [
  "reuniao",
  "apresentacao_semanal",
  "prazo",
  "capacitacao",
  "feriado",
  "outro",
]);

export const eventos = pgTable(
  "eventos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    titulo: text("titulo").notNull(),
    descricao: text("descricao"),
    local: text("local"),
    tipo: tipoEventoEnum("tipo").notNull().default("outro"),
    inicio: timestamp("inicio", { withTimezone: true }).notNull(),
    fim: timestamp("fim", { withTimezone: true }).notNull(),
    diaInteiro: boolean("dia_inteiro").notNull().default(false),
    nucleoId: uuid("nucleo_id").references(() => nucleos.id, {
      onDelete: "set null",
    }),
    criadoPor: uuid("criado_por").references(() => servidores.id, {
      onDelete: "set null",
    }),
    lembretesMin: integer("lembretes_min")
      .array()
      .notNull()
      .default(sql`'{}'::integer[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ix_eventos_inicio").on(t.inicio),
    index("ix_eventos_fim").on(t.fim),
    index("ix_eventos_tipo").on(t.tipo),
    check("chk_eventos_periodo", sql`${t.fim} >= ${t.inicio}`),
    check(
      "chk_eventos_titulo",
      sql`length(trim(${t.titulo})) BETWEEN 2 AND 200`,
    ),
  ],
);
