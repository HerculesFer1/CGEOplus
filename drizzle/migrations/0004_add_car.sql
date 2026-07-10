-- Módulo CAR — Análise de Passivo do Cadastro Ambiental Rural
-- Cria enums, tabelas, índices, RLS default-deny e semeia o mapa Fase→Bucket
-- com as 22 fases já conhecidas (11 do modelo antigo + 10 novas + 1 suspenso).

CREATE TYPE "public"."car_bucket" AS ENUM(
  'AG_GESTOR','PENDENTE','VALIDADO','CANCELADO','SUSPENSO','NAO_CLASSIFICADO'
);--> statement-breakpoint
CREATE TYPE "public"."car_situacao" AS ENUM(
  'Ativo','Cancelado','Pendente','Retificado','Suspenso'
);--> statement-breakpoint
CREATE TYPE "public"."car_import_status" AS ENUM(
  'processando','concluida','parcial','falhou'
);--> statement-breakpoint
CREATE TYPE "public"."car_map_origem" AS ENUM('seed','manual','auto');--> statement-breakpoint

-- ─── Mapa Fase → Bucket ─────────────────────────────────────────────────────
CREATE TABLE "car_fase_bucket_map" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "fase_original"  text NOT NULL,
  "bucket"         "car_bucket" NOT NULL,
  "observacao"     text,
  "origem"         "car_map_origem" DEFAULT 'seed' NOT NULL,
  "criado_por"     uuid REFERENCES "servidores"("id"),
  "criado_em"      timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "car_fase_bucket_map_fase_original_unique" UNIQUE("fase_original")
);--> statement-breakpoint
CREATE INDEX "ix_car_map_bucket" ON "car_fase_bucket_map"("bucket");--> statement-breakpoint

-- ─── Importações mensais ────────────────────────────────────────────────────
CREATE TABLE "car_importacao" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ano"               integer NOT NULL,
  "mes"               smallint NOT NULL,
  "arquivo_original"  text,
  "arquivo_checksum"  text,
  "total_registros"   integer NOT NULL,
  "importado_por"     uuid REFERENCES "servidores"("id"),
  "importado_em"      timestamp with time zone DEFAULT now() NOT NULL,
  "status"            "car_import_status" DEFAULT 'concluida' NOT NULL,
  "resumo"            jsonb,
  CONSTRAINT "chk_car_mes_valido" CHECK ("mes" BETWEEN 1 AND 12)
);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_car_importacao_ano_mes" ON "car_importacao"("ano","mes");--> statement-breakpoint

-- ─── Registros brutos (~334k/mês) ───────────────────────────────────────────
CREATE TABLE "car_registro" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "import_id"      uuid NOT NULL REFERENCES "car_importacao"("id") ON DELETE CASCADE,
  "numero_recibo"  text NOT NULL,
  "municipio"      text NOT NULL,
  "situacao"       "car_situacao" NOT NULL,
  "fase_original"  text NOT NULL,
  "bucket"         "car_bucket" NOT NULL
);--> statement-breakpoint
CREATE INDEX "ix_car_registro_import"           ON "car_registro"("import_id");--> statement-breakpoint
CREATE INDEX "ix_car_registro_import_municipio" ON "car_registro"("import_id","municipio");--> statement-breakpoint
CREATE INDEX "ix_car_registro_import_bucket"    ON "car_registro"("import_id","bucket");--> statement-breakpoint
CREATE INDEX "ix_car_registro_import_situacao"  ON "car_registro"("import_id","situacao");--> statement-breakpoint

-- ─── Ranking nacional por UF ────────────────────────────────────────────────
CREATE TABLE "car_uf_ranking" (
  "id"     uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ano"    integer NOT NULL,
  "mes"    smallint NOT NULL,
  "uf"     char(2) NOT NULL,
  "total"  integer NOT NULL,
  CONSTRAINT "chk_car_uf_mes_valido" CHECK ("mes" BETWEEN 1 AND 12)
);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_car_uf_ranking_ano_mes_uf" ON "car_uf_ranking"("ano","mes","uf");--> statement-breakpoint

-- ─── RLS default-deny (padrão do projeto; Drizzle bypassa via role postgres) ─
ALTER TABLE "car_fase_bucket_map" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "car_importacao"      ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "car_registro"        ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "car_uf_ranking"      ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- ─── Seed do mapa Fase → Bucket (22 fases) ──────────────────────────────────
-- 4 VALIDADOS (originais da Planilha1)
INSERT INTO "car_fase_bucket_map" ("fase_original","bucket","origem") VALUES
  ('Analisado, em conformidade com a Lei nº 12.651/2012','VALIDADO','seed'),
  ('Analisado, em conformidade com a Lei nº 12.651/2012, com ativos ambientais','VALIDADO','seed'),
  ('Analisado, em regularização ambiental (Lei nº 12.651/2012)','VALIDADO','seed'),
  ('Analisado, em regularização ambiental (Lei nº 12.651/2012), com ativos ambientais','VALIDADO','seed');--> statement-breakpoint

-- 1 VALIDADO com observação (nova, decisão do usuário 2026-07-10)
INSERT INTO "car_fase_bucket_map" ("fase_original","bucket","observacao","origem") VALUES
  ('Analisado, aguardando regularização ambiental (Lei nº 12.651/2012)','VALIDADO',
   'Análise concluída; aguarda proprietário aderir ao PRA (Programa de Regularização Ambiental).',
   'seed');--> statement-breakpoint

-- 3 CANCELADOS
INSERT INTO "car_fase_bucket_map" ("fase_original","bucket","origem") VALUES
  ('Cancelado por solicitação do proprietário/possuidor','CANCELADO','seed'),
  ('Cancelado por decisão administrativa','CANCELADO','seed'),
  ('Cancelado por decisão judicial','CANCELADO','seed');--> statement-breakpoint

-- 4 PENDENTE (originais)
INSERT INTO "car_fase_bucket_map" ("fase_original","bucket","origem") VALUES
  ('Analisado com pendências, aguardando retificação e/ou apresentação de documentos','PENDENTE','seed'),
  ('Analisado com pendências, aguardando apresentação de documentos','PENDENTE','seed'),
  ('Analisado com pendências, aguardando atendimento a outras restrições','PENDENTE','seed'),
  ('Analisado com pendências, aguardando retificação','PENDENTE','seed');--> statement-breakpoint

-- 2 PENDENTE (novas)
INSERT INTO "car_fase_bucket_map" ("fase_original","bucket","origem") VALUES
  ('Revisado, aguardando aceite pelo proprietário/possuidor','PENDENTE','seed'),
  ('Em Retificação Dinamizada','PENDENTE','seed');--> statement-breakpoint

-- 1 SUSPENSO
INSERT INTO "car_fase_bucket_map" ("fase_original","bucket","origem") VALUES
  ('Análise da Secretaria','SUSPENSO','seed');--> statement-breakpoint

-- 7 AG_GESTOR (todas novas — a Planilha1 não cobria nenhuma "aguardando análise")
INSERT INTO "car_fase_bucket_map" ("fase_original","bucket","origem") VALUES
  ('Aguardando análise, após atendimento da notificação','AG_GESTOR','seed'),
  ('Aguardando análise, não passível de revisão de dados','AG_GESTOR','seed'),
  ('Aguardando análise, passível de revisão de dados','AG_GESTOR','seed'),
  ('Em análise','AG_GESTOR','seed'),
  ('Em processo de revisão de dados','AG_GESTOR','seed'),
  ('Revisado, aguardando Análise da Regularidade Ambiental','AG_GESTOR','seed'),
  ('Revisado, aguardando análise da equipe','AG_GESTOR','seed');
