-- Módulo Eventos: agenda do CGEO com lembretes in-app.
-- Sem recorrência (definido com Hércules em 2026-07-14 — criação manual por
-- ocorrência). Lembretes ficam num array de minutos-antes (ex: [1440, 60] =
-- 1 dia antes + 1h antes). Sino do topbar (e futura tela pós-login) consulta
-- eventos onde now() ∈ [inicio - lembrete_min, inicio].
-- Aplicado remotamente em 2026-07-14 via Supabase MCP (mesma SQL).

CREATE TYPE "public"."tipo_evento" AS ENUM(
  'reuniao',
  'apresentacao_semanal',
  'prazo',
  'capacitacao',
  'feriado',
  'outro'
);--> statement-breakpoint

CREATE TABLE "eventos" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "titulo"          text NOT NULL,
  "descricao"       text,
  "local"           text,
  "tipo"            "tipo_evento" NOT NULL DEFAULT 'outro',
  "inicio"          timestamptz NOT NULL,
  "fim"             timestamptz NOT NULL,
  "dia_inteiro"     boolean NOT NULL DEFAULT false,
  "nucleo_id"       uuid REFERENCES "nucleos"("id") ON DELETE SET NULL,
  "criado_por"      uuid REFERENCES "servidores"("id") ON DELETE SET NULL,
  "lembretes_min"   integer[] NOT NULL DEFAULT '{}'::integer[],
  "created_at"      timestamptz NOT NULL DEFAULT now(),
  "updated_at"      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "chk_eventos_periodo" CHECK (fim >= inicio),
  CONSTRAINT "chk_eventos_titulo"  CHECK (length(trim(titulo)) BETWEEN 2 AND 200)
);--> statement-breakpoint

CREATE INDEX "ix_eventos_inicio" ON "eventos" (inicio);--> statement-breakpoint
CREATE INDEX "ix_eventos_fim"    ON "eventos" (fim);--> statement-breakpoint
CREATE INDEX "ix_eventos_tipo"   ON "eventos" (tipo);--> statement-breakpoint
CREATE INDEX "ix_eventos_nucleo" ON "eventos" (nucleo_id) WHERE nucleo_id IS NOT NULL;--> statement-breakpoint

ALTER TABLE "eventos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE OR REPLACE FUNCTION "eventos_set_updated_at"() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER "trg_eventos_updated_at"
  BEFORE UPDATE ON "eventos"
  FOR EACH ROW EXECUTE FUNCTION "eventos_set_updated_at"();
