-- Módulo Metas: cadastro de metas mensais/semanais com escopo polimórfico
-- (institucional, núcleo, servidor, sistema, atividade). Progresso é calculado
-- em tempo real via query em analises — sem tabela auxiliar de "realizado".
-- Aplicado remotamente em 2026-07-14 via Supabase MCP (mesma SQL).

CREATE TYPE "public"."meta_periodo" AS ENUM('mensal', 'semanal');--> statement-breakpoint
CREATE TYPE "public"."meta_escopo" AS ENUM('institucional', 'nucleo', 'servidor', 'sistema', 'atividade');--> statement-breakpoint
CREATE TYPE "public"."meta_metrica" AS ENUM(
  'analises_registradas',
  'analises_finalizadas',
  'taxa_finalizacao',
  'processos_concluidos'
);--> statement-breakpoint

CREATE TABLE "metas" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "periodo"      "meta_periodo" NOT NULL,
  "escopo"       "meta_escopo" NOT NULL,
  "alvo_id"      uuid,
  "alvo_sistema" "sistema",
  "metrica"      "meta_metrica" NOT NULL,
  "valor_alvo"   numeric(10,2) NOT NULL,
  "ano"          smallint NOT NULL,
  "mes"          smallint,
  "semana_iso"   smallint,
  "observacao"   text,
  "criado_por"   uuid REFERENCES "servidores"("id") ON DELETE SET NULL,
  "created_at"   timestamptz DEFAULT now() NOT NULL,
  "updated_at"   timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT "chk_metas_periodo_campos" CHECK (
    (periodo = 'mensal'  AND mes BETWEEN 1 AND 12 AND semana_iso IS NULL)
    OR
    (periodo = 'semanal' AND semana_iso BETWEEN 1 AND 53 AND mes IS NULL)
  ),
  CONSTRAINT "chk_metas_escopo_alvo" CHECK (
    (escopo = 'institucional' AND alvo_id IS NULL AND alvo_sistema IS NULL)
    OR
    (escopo IN ('nucleo', 'servidor', 'atividade') AND alvo_id IS NOT NULL AND alvo_sistema IS NULL)
    OR
    (escopo = 'sistema' AND alvo_sistema IS NOT NULL AND alvo_id IS NULL)
  ),
  CONSTRAINT "chk_metas_valor_positivo" CHECK (valor_alvo > 0),
  CONSTRAINT "chk_metas_taxa_max"       CHECK (metrica <> 'taxa_finalizacao' OR valor_alvo <= 100),
  CONSTRAINT "chk_metas_ano"            CHECK (ano BETWEEN 2020 AND 2100)
);--> statement-breakpoint

CREATE UNIQUE INDEX "ux_metas_dedup_institucional_mensal" ON "metas"
  (metrica, ano, mes)
  WHERE escopo = 'institucional' AND periodo = 'mensal';--> statement-breakpoint
CREATE UNIQUE INDEX "ux_metas_dedup_institucional_semanal" ON "metas"
  (metrica, ano, semana_iso)
  WHERE escopo = 'institucional' AND periodo = 'semanal';--> statement-breakpoint
CREATE UNIQUE INDEX "ux_metas_dedup_sistema_mensal" ON "metas"
  (alvo_sistema, metrica, ano, mes)
  WHERE escopo = 'sistema' AND periodo = 'mensal';--> statement-breakpoint
CREATE UNIQUE INDEX "ux_metas_dedup_sistema_semanal" ON "metas"
  (alvo_sistema, metrica, ano, semana_iso)
  WHERE escopo = 'sistema' AND periodo = 'semanal';--> statement-breakpoint
CREATE UNIQUE INDEX "ux_metas_dedup_alvo_mensal" ON "metas"
  (escopo, alvo_id, metrica, ano, mes)
  WHERE escopo IN ('nucleo', 'servidor', 'atividade') AND periodo = 'mensal';--> statement-breakpoint
CREATE UNIQUE INDEX "ux_metas_dedup_alvo_semanal" ON "metas"
  (escopo, alvo_id, metrica, ano, semana_iso)
  WHERE escopo IN ('nucleo', 'servidor', 'atividade') AND periodo = 'semanal';--> statement-breakpoint

CREATE INDEX "ix_metas_periodo"     ON "metas" (periodo, ano, mes, semana_iso);--> statement-breakpoint
CREATE INDEX "ix_metas_escopo_alvo" ON "metas" (escopo, alvo_id);--> statement-breakpoint

ALTER TABLE "metas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE OR REPLACE FUNCTION "metas_set_updated_at"() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER "trg_metas_updated_at"
  BEFORE UPDATE ON "metas"
  FOR EACH ROW EXECUTE FUNCTION "metas_set_updated_at"();
