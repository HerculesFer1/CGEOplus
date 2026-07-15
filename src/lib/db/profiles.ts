/**
 * CGEO+ Módulo Profiles — identidade + gate de aprovação por admin.
 *
 * Toda linha em `auth.users` (Supabase) ganha uma linha em `profiles` via
 * trigger `on_auth_user_created`. O seed `hercules.cgeo@gmail.com` nasce
 * admin+approved; os demais nascem servidor+pending, esperando aprovação
 * do admin em /admin/aprovacoes. O proxy.ts checa `approved=true` antes
 * de liberar qualquer rota autenticada.
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { servidores } from "./schema";

export const userRoleEnum = pgEnum("user_role", ["admin", "servidor"]);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull().unique(),
    nome: text("nome").notNull(),
    matricula: text("matricula"),
    cargo: text("cargo"),
    role: userRoleEnum("role").notNull().default("servidor"),
    approved: boolean("approved").notNull().default(false),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references((): AnyPgColumn => profiles.id, {
      onDelete: "set null",
    }),
    // Vínculo com o catálogo operacional. NULL até o admin decidir na aprovação.
    servidorId: uuid("servidor_id").references(() => servidores.id, {
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
    index("ix_profiles_pending")
      .on(sql`${t.createdAt} DESC`)
      .where(sql`${t.approved} = false`),
    index("ix_profiles_role_admin")
      .on(t.role)
      .where(sql`${t.role} = 'admin'`),
    uniqueIndex("ux_profiles_servidor_id")
      .on(t.servidorId)
      .where(sql`${t.servidorId} IS NOT NULL`),
    uniqueIndex("ux_profiles_matricula")
      .on(t.matricula)
      .where(sql`${t.matricula} IS NOT NULL`),
  ],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
