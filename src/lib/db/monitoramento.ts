/**
 * CGEO+ Módulo Monitoramento de Programas
 *
 * Modela a dinâmica extraída das planilhas PSI MONITORAMENTO.xlsx e
 * _PILARES II - Monitoramento.xlsx:
 *   - Programas (PSI, PILARES II, PILARES I ...)
 *   - Intervalos anuais/marcos com metas (famílias, CAR, títulos)
 *   - Comunidades (cadastro único, deduplicado)
 *   - Títulos individuais (uma linha = um título/CAR)
 *   - Validações no SICAR (histórico)
 *   - Importações de planilha (auditoria de origem)
 *
 * Views de resumo são criadas por migração SQL separada.
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  date,
  timestamp,
  integer,
  pgEnum,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { servidores } from "./schema";

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const carStatusEnum = pgEnum("car_status", ["SIM", "NAO", "PENDENTE"]);

export const validacaoStatusEnum = pgEnum("validacao_status", [
  "NAO_VALIDADO",
  "EM_ANALISE",
  "VALIDADO",
  "DIVERGENTE",
]);

export const tipoComunidadeEnum = pgEnum("tipo_comunidade", [
  "ASSENTAMENTO",
  "PCT_QUILOMBOLA",
  "PCT_INDIGENA",
  "PCT_OUTROS",
  "FAZENDA_ESTADUAL",
  "OUTRO",
]);

export const importOrigemEnum = pgEnum("import_origem", [
  "PLANILHA_MONITORAMENTO",
  "PLANILHA_SICAR",
  "INTERPI_API",
  "SICAR_API",
  "MANUAL",
]);

/* ==========================================================================
   PROGRAMAS E INTERVALOS
   ========================================================================== */

export const programas = pgTable(
  "programas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sigla: text("sigla").notNull().unique(), // "PSI", "PILARES_II"
    nome: text("nome").notNull(),
    orgao: text("orgao"),
    descricao: text("descricao"),
    ativo: boolean("ativo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/**
 * Intervalos: unidade temporal do programa (ano fiscal / marco de meta).
 * Cada intervalo carrega as metas com que se compara o realizado.
 */
export const programaIntervalos = pgTable(
  "programa_intervalos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    programaId: uuid("programa_id")
      .notNull()
      .references(() => programas.id, { onDelete: "cascade" }),
    rotulo: text("rotulo").notNull(), // "INTERVALO 3: 2025", "ANO 02"
    ordem: integer("ordem").notNull(),
    dataInicio: date("data_inicio").notNull(),
    dataFim: date("data_fim").notNull(),
    metaFamilias: integer("meta_familias"),
    metaCar: integer("meta_car"),
    metaTitulos: integer("meta_titulos"),
    observacoes: text("observacoes"),
  },
  (t) => [
    uniqueIndex("ux_intervalos_programa_ordem").on(t.programaId, t.ordem),
    index("ix_intervalos_data_inicio").on(t.dataInicio),
    index("ix_intervalos_data_fim").on(t.dataFim),
  ],
);

/* ==========================================================================
   COMUNIDADES (cadastro único, deduplicado)
   ========================================================================== */

export const comunidades = pgTable(
  "comunidades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nomeCanonico: text("nome_canonico").notNull(),
    // slug normalizado (uppercase + sem acento + trim) para dedup e match
    slug: text("slug").notNull().unique(),
    tipo: tipoComunidadeEnum("tipo").notNull().default("OUTRO"),
    municipio: text("municipio"), // pode ter mais de um (ex: "Oeiras, Colônia do Piauí")
    territorio: text("territorio"),
    idInterpi: text("id_interpi"),
    aliases: jsonb("aliases").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    ativo: boolean("ativo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ix_comunidades_nome").on(t.nomeCanonico),
    index("ix_comunidades_municipio").on(t.municipio),
  ],
);

/* ==========================================================================
   TÍTULOS
   ========================================================================== */

export const titulos = pgTable(
  "titulos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    programaId: uuid("programa_id")
      .notNull()
      .references(() => programas.id, { onDelete: "restrict" }),
    intervaloId: uuid("intervalo_id")
      .notNull()
      .references(() => programaIntervalos.id, { onDelete: "restrict" }),
    comunidadeId: uuid("comunidade_id")
      .notNull()
      .references(() => comunidades.id, { onDelete: "restrict" }),

    processoSei: text("processo_sei"),
    beneficiarioMasked: text("beneficiario_masked"), // já anonimizado como está na planilha
    cpfHash: text("cpf_hash"), // hash SHA-256, evita repor CPF em claro
    genero: text("genero"),
    estadoCivil: text("estado_civil"),
    tipoImovel: text("tipo_imovel"),

    municipio: text("municipio"),
    territorio: text("territorio"),

    numeroTitulos: integer("numero_titulos").notNull().default(1),
    numeroFamilias: integer("numero_familias").notNull().default(1),

    tipo: text("tipo"), // "Título de Doação", ...
    categoriaTitulo: text("categoria_titulo"),
    dataAssinatura: date("data_assinatura").notNull(),

    carStatus: carStatusEnum("car_status").notNull().default("PENDENTE"),
    reciboCar: text("recibo_car"),
    nomeLote: text("nome_lote"),
    obsCar: text("obs_car"),
    cadastranteCar: text("cadastrante_car"),

    projeto: text("projeto"),
    sncr: text("sncr"),
    faseProcesso: text("fase_processo"),

    conferenciaCpfProprietario: text("conferencia_cpf_proprietario"),
    conferenciaProprietario: text("conferencia_proprietario"),
    conferenciaCadastrante: text("conferencia_cadastrante"),

    validacaoAtual: validacaoStatusEnum("validacao_atual")
      .notNull()
      .default("NAO_VALIDADO"),

    importId: uuid("import_id").references(() => imports.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Dedup: mesmo processo + comunidade + data = mesmo título
    uniqueIndex("ux_titulo_dedup")
      .on(t.processoSei, t.comunidadeId, t.dataAssinatura)
      .where(sql`${t.processoSei} IS NOT NULL`),
    index("ix_titulos_intervalo").on(t.intervaloId),
    index("ix_titulos_comunidade").on(t.comunidadeId),
    index("ix_titulos_data").on(t.dataAssinatura),
    index("ix_titulos_car").on(t.carStatus),
    index("ix_titulos_recibo").on(t.reciboCar),
    index("ix_titulos_programa_intervalo").on(t.programaId, t.intervaloId),
  ],
);

/* ==========================================================================
   VALIDAÇÕES (histórico SICAR)
   ========================================================================== */

export const tituloValidacoes = pgTable(
  "titulo_validacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tituloId: uuid("titulo_id")
      .notNull()
      .references(() => titulos.id, { onDelete: "cascade" }),
    data: date("data").notNull(),
    status: validacaoStatusEnum("status").notNull(),
    analista: text("analista"),
    servidorId: uuid("servidor_id").references(() => servidores.id),
    obs: text("obs"),
    importId: uuid("import_id").references(() => imports.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ix_validacoes_titulo").on(t.tituloId, t.data),
    index("ix_validacoes_status").on(t.status),
  ],
);

/* ==========================================================================
   IMPORTS (auditoria de origem)
   ========================================================================== */

export const imports = pgTable(
  "imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    origem: importOrigemEnum("origem").notNull(),
    arquivoNome: text("arquivo_nome"),
    arquivoChecksum: text("arquivo_checksum"),
    programaId: uuid("programa_id").references(() => programas.id, {
      onDelete: "set null",
    }),
    servidorId: uuid("servidor_id").references(() => servidores.id),
    resumo: jsonb("resumo"), // { linhas_lidas, titulos_criados, titulos_atualizados, duplicados, erros }
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ix_imports_criado_em").on(t.criadoEm),
    index("ix_imports_programa").on(t.programaId),
  ],
);

/* ==========================================================================
   RELATIONS
   ========================================================================== */

export const programasRelations = relations(programas, ({ many }) => ({
  intervalos: many(programaIntervalos),
  titulos: many(titulos),
  imports: many(imports),
}));

export const programaIntervalosRelations = relations(
  programaIntervalos,
  ({ one, many }) => ({
    programa: one(programas, {
      fields: [programaIntervalos.programaId],
      references: [programas.id],
    }),
    titulos: many(titulos),
  }),
);

export const comunidadesRelations = relations(comunidades, ({ many }) => ({
  titulos: many(titulos),
}));

export const titulosRelations = relations(titulos, ({ one, many }) => ({
  programa: one(programas, {
    fields: [titulos.programaId],
    references: [programas.id],
  }),
  intervalo: one(programaIntervalos, {
    fields: [titulos.intervaloId],
    references: [programaIntervalos.id],
  }),
  comunidade: one(comunidades, {
    fields: [titulos.comunidadeId],
    references: [comunidades.id],
  }),
  validacoes: many(tituloValidacoes),
  import: one(imports, {
    fields: [titulos.importId],
    references: [imports.id],
  }),
}));

export const tituloValidacoesRelations = relations(tituloValidacoes, ({ one }) => ({
  titulo: one(titulos, {
    fields: [tituloValidacoes.tituloId],
    references: [titulos.id],
  }),
  servidor: one(servidores, {
    fields: [tituloValidacoes.servidorId],
    references: [servidores.id],
  }),
  import: one(imports, {
    fields: [tituloValidacoes.importId],
    references: [imports.id],
  }),
}));

export const importsRelations = relations(imports, ({ one, many }) => ({
  programa: one(programas, {
    fields: [imports.programaId],
    references: [programas.id],
  }),
  servidor: one(servidores, {
    fields: [imports.servidorId],
    references: [servidores.id],
  }),
  titulos: many(titulos),
  validacoes: many(tituloValidacoes),
}));
