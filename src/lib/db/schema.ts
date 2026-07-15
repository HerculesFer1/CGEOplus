/**
 * CGEO+ Database Schema (Drizzle ORM · PostgreSQL)
 *
 * Modelo fiel à realidade da planilha PROCESSOS_CONTABILIZAR_[2026].xlsx,
 * refinado para suportar:
 *  - Servidores em múltiplos núcleos (histórico temporal)
 *  - Múltiplas análises por processo (mesmo ou diferentes analistas)
 *  - Normalização de SICAR: sistema + finalidade (Lançamento/Análise/Mapeamento)
 *
 * Enums espelham os valores reais descobertos na planilha.
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  date,
  timestamp,
  integer,
  smallint,
  pgEnum,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ==========================================================================
   ENUMS — refletem valores reais da planilha
   ========================================================================== */

export const vinculoEnum = pgEnum("vinculo", [
  "Efetivo",
  "Consultor",
  "Consultor PSI",
  "Consultor Pilares II",
  "Terceirizado",
  "Suporte",
]);

export const statusServidorEnum = pgEnum("status_servidor", [
  "ativo",
  "inativo",
  "afastado",
]);

export const complexidadeEnum = pgEnum("complexidade", ["N1", "N2", "N3"]);

/** Sistemas: valores no banco em MAIÚSCULAS para bater com a planilha.
 *  SINAFLOR foi identificado durante o import da planilha real de FEVEREIRO. */
export const sistemaEnum = pgEnum("sistema", ["SEI", "SIGA", "SICAR", "SINAFLOR"]);

/** Finalidade do SICAR — obrigatória quando sistema = SICAR. */
export const sicarFinalidadeEnum = pgEnum("sicar_finalidade", [
  "Lancamento",
  "Analise",
  "Mapeamento",
]);

/** Status da análise (não do processo em si — cada análise tem seu resultado). */
export const resultadoAnaliseEnum = pgEnum("resultado_analise", [
  "Finalizado",
  "Analisado com pendencia",
  "Indeferido",
  "Desarquivado",
]);

/** Setor de destino após análise. */
export const setorDestinoEnum = pgEnum("setor_destino", [
  "Concluido no setor",
  "CGEO",
  "FLORESTA",
  "Licenciamento",
  "SICAR",
]);

export const statusProcessoEnum = pgEnum("status_processo", [
  "em_analise",
  "concluido",
  "arquivado",
]);

/* ==========================================================================
   IDENTIDADE E ORGANIZAÇÃO
   ========================================================================== */

export const servidores = pgTable(
  "servidores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    apelido: text("apelido"), // "Marco", "Tereza" — como aparece na planilha
    matricula: text("matricula").unique(),
    email: text("email").notNull().unique(),
    cargo: text("cargo").notNull(),
    tipoVinculo: vinculoEnum("tipo_vinculo").notNull(),
    especialidade: text("especialidade"),
    formacao: text("formacao"),
    dataIngresso: date("data_ingresso").notNull(),
    dataNascimento: date("data_nascimento"),
    status: statusServidorEnum("status").notNull().default("ativo"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ix_servidores_apelido").on(t.apelido)],
);

export const nucleos = pgTable("nucleos", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull().unique(),
  descricao: text("descricao"),
  corTema: text("cor_tema"),
  minMembros: smallint("min_membros").notNull().default(2),
  ativo: boolean("ativo").notNull().default(true),
});

/** Vínculo N:N temporal — resolve a dinâmica de dissolução dos núcleos. */
export const servidorNucleo = pgTable(
  "servidor_nucleo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    servidorId: uuid("servidor_id")
      .notNull()
      .references(() => servidores.id, { onDelete: "cascade" }),
    nucleoId: uuid("nucleo_id")
      .notNull()
      .references(() => nucleos.id, { onDelete: "cascade" }),
    isPrincipal: boolean("is_principal").notNull().default(false),
    dataInicio: date("data_inicio").notNull(),
    dataFim: date("data_fim"), // null = ativo
    motivo: text("motivo"), // "contingência", "reorganização", ...
  },
  (t) => [
    // Um servidor só pode ter 1 vínculo principal ativo
    uniqueIndex("ux_servidor_nucleo_principal_ativo")
      .on(t.servidorId)
      .where(sql`${t.isPrincipal} AND ${t.dataFim} IS NULL`),
    check(
      "chk_data_fim_valida",
      sql`${t.dataFim} IS NULL OR ${t.dataFim} >= ${t.dataInicio}`,
    ),
  ],
);

/* ==========================================================================
   CATÁLOGOS
   ========================================================================== */

export const atividades = pgTable("atividades", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  complexidade: complexidadeEnum("complexidade").notNull(),
  nucleoId: uuid("nucleo_id").references(() => nucleos.id),
  descricao: text("descricao"),
  ativo: boolean("ativo").notNull().default(true),
});

/* ==========================================================================
   NÚCLEO OPERACIONAL — Processos e Análises
   ========================================================================== */

export const processos = pgTable(
  "processos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    numero: text("numero").notNull(),
    sistema: sistemaEnum("sistema").notNull(),
    sicarFinalidade: sicarFinalidadeEnum("sicar_finalidade"),
    requerente: text("requerente"),
    municipio: text("municipio"),
    dataEntrada: date("data_entrada").notNull(),
    statusAtual: statusProcessoEnum("status_atual")
      .notNull()
      .default("em_analise"),
    observacoes: text("observacoes"),
    createdBy: uuid("created_by").references(() => servidores.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("ux_processos_numero_sistema").on(t.numero, t.sistema),
    // Regra crítica: SICAR exige finalidade; outros sistemas não permitem.
    check(
      "chk_sicar_finalidade",
      sql`(${t.sistema} = 'SICAR' AND ${t.sicarFinalidade} IS NOT NULL)
        OR (${t.sistema} <> 'SICAR' AND ${t.sicarFinalidade} IS NULL)`,
    ),
    index("ix_processos_data_entrada").on(t.dataEntrada),
    index("ix_processos_sistema").on(t.sistema),
  ],
);

/**
 * Entidade-chave: cada linha da planilha é uma análise.
 * Um mesmo processo pode ter N análises (mesmo servidor ou diferentes).
 */
export const analises = pgTable(
  "analises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    processoId: uuid("processo_id")
      .notNull()
      .references(() => processos.id, { onDelete: "cascade" }),
    servidorId: uuid("servidor_id")
      .notNull()
      .references(() => servidores.id),
    atividadeId: uuid("atividade_id").references(() => atividades.id),
    dataAnalise: date("data_analise").notNull(),
    resultado: resultadoAnaliseEnum("resultado").notNull(),
    setorDestino: setorDestinoEnum("setor_destino"),
    tempoGastoMin: integer("tempo_gasto_min"),
    observacoes: text("observacoes"),
    numeroOrdem: integer("numero_ordem"), // 1ª, 2ª, 3ª análise do mesmo processo
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ix_analises_data").on(t.dataAnalise),
    index("ix_analises_servidor").on(t.servidorId, t.dataAnalise),
    index("ix_analises_processo").on(t.processoId, t.numeroOrdem),
  ],
);

/* ==========================================================================
   RELATIONS (para queries Drizzle tipadas)
   ========================================================================== */

export const servidoresRelations = relations(servidores, ({ many }) => ({
  vinculos: many(servidorNucleo),
  analises: many(analises),
}));

export const nucleosRelations = relations(nucleos, ({ many }) => ({
  vinculos: many(servidorNucleo),
  atividades: many(atividades),
}));

export const servidorNucleoRelations = relations(servidorNucleo, ({ one }) => ({
  servidor: one(servidores, {
    fields: [servidorNucleo.servidorId],
    references: [servidores.id],
  }),
  nucleo: one(nucleos, {
    fields: [servidorNucleo.nucleoId],
    references: [nucleos.id],
  }),
}));

export const processosRelations = relations(processos, ({ many, one }) => ({
  analises: many(analises),
  criadoPor: one(servidores, {
    fields: [processos.createdBy],
    references: [servidores.id],
  }),
}));

export const analisesRelations = relations(analises, ({ one }) => ({
  processo: one(processos, {
    fields: [analises.processoId],
    references: [processos.id],
  }),
  servidor: one(servidores, {
    fields: [analises.servidorId],
    references: [servidores.id],
  }),
  atividade: one(atividades, {
    fields: [analises.atividadeId],
    references: [atividades.id],
  }),
}));

export const atividadesRelations = relations(atividades, ({ one, many }) => ({
  nucleo: one(nucleos, {
    fields: [atividades.nucleoId],
    references: [nucleos.id],
  }),
  analises: many(analises),
}));

/* ==========================================================================
   MONITORAMENTO DE PROGRAMAS (PSI, PILARES II, ...)
   Reexporta tudo do módulo separado para o drizzle-kit ver.
   ========================================================================== */

export * from "./monitoramento";

/* ==========================================================================
   CAR — Análise de Passivo do Cadastro Ambiental Rural
   ========================================================================== */

export * from "./car";

/* ==========================================================================
   METAS — cadastro de metas mensais/semanais
   ========================================================================== */

export * from "./metas";

/* ==========================================================================
   EVENTOS — agenda com lembretes in-app
   ========================================================================== */

export * from "./eventos";

/* ==========================================================================
   PROFILES — identidade + aprovação de acesso pelo admin
   ========================================================================== */

export * from "./profiles";

/* ==========================================================================
   HISTÓRICO TEMPORAL (SCD2) — audit trail de núcleos e atividades
   ========================================================================== */

export * from "./historico";
