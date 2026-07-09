CREATE TYPE "public"."car_status" AS ENUM('SIM', 'NAO', 'PENDENTE');--> statement-breakpoint
CREATE TYPE "public"."import_origem" AS ENUM('PLANILHA_MONITORAMENTO', 'PLANILHA_SICAR', 'INTERPI_API', 'SICAR_API', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."tipo_comunidade" AS ENUM('ASSENTAMENTO', 'PCT_QUILOMBOLA', 'PCT_INDIGENA', 'PCT_OUTROS', 'FAZENDA_ESTADUAL', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."validacao_status" AS ENUM('NAO_VALIDADO', 'EM_ANALISE', 'VALIDADO', 'DIVERGENTE');--> statement-breakpoint
-- SINAFLOR/vínculos já foram adicionados em migrations manuais anteriores; omitidos aqui.
CREATE TABLE "comunidades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome_canonico" text NOT NULL,
	"slug" text NOT NULL,
	"tipo" "tipo_comunidade" DEFAULT 'OUTRO' NOT NULL,
	"municipio" text,
	"territorio" text,
	"id_interpi" text,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comunidades_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"origem" "import_origem" NOT NULL,
	"arquivo_nome" text,
	"arquivo_checksum" text,
	"programa_id" uuid,
	"servidor_id" uuid,
	"resumo" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programa_intervalos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"programa_id" uuid NOT NULL,
	"rotulo" text NOT NULL,
	"ordem" integer NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim" date NOT NULL,
	"meta_familias" integer,
	"meta_car" integer,
	"meta_titulos" integer,
	"observacoes" text
);
--> statement-breakpoint
CREATE TABLE "programas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sigla" text NOT NULL,
	"nome" text NOT NULL,
	"orgao" text,
	"descricao" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "programas_sigla_unique" UNIQUE("sigla")
);
--> statement-breakpoint
CREATE TABLE "titulo_validacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo_id" uuid NOT NULL,
	"data" date NOT NULL,
	"status" "validacao_status" NOT NULL,
	"analista" text,
	"servidor_id" uuid,
	"obs" text,
	"import_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "titulos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"programa_id" uuid NOT NULL,
	"intervalo_id" uuid NOT NULL,
	"comunidade_id" uuid NOT NULL,
	"processo_sei" text,
	"beneficiario_masked" text,
	"cpf_hash" text,
	"genero" text,
	"estado_civil" text,
	"tipo_imovel" text,
	"municipio" text,
	"territorio" text,
	"numero_titulos" integer DEFAULT 1 NOT NULL,
	"numero_familias" integer DEFAULT 1 NOT NULL,
	"tipo" text,
	"categoria_titulo" text,
	"data_assinatura" date NOT NULL,
	"car_status" "car_status" DEFAULT 'PENDENTE' NOT NULL,
	"recibo_car" text,
	"nome_lote" text,
	"obs_car" text,
	"cadastrante_car" text,
	"projeto" text,
	"sncr" text,
	"fase_processo" text,
	"conferencia_cpf_proprietario" text,
	"conferencia_proprietario" text,
	"conferencia_cadastrante" text,
	"validacao_atual" "validacao_status" DEFAULT 'NAO_VALIDADO' NOT NULL,
	"import_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- formacao/data_nascimento já aplicados em 0002_add_perfil_fields.sql
ALTER TABLE "imports" ADD CONSTRAINT "imports_programa_id_programas_id_fk" FOREIGN KEY ("programa_id") REFERENCES "public"."programas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_servidor_id_servidores_id_fk" FOREIGN KEY ("servidor_id") REFERENCES "public"."servidores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programa_intervalos" ADD CONSTRAINT "programa_intervalos_programa_id_programas_id_fk" FOREIGN KEY ("programa_id") REFERENCES "public"."programas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titulo_validacoes" ADD CONSTRAINT "titulo_validacoes_titulo_id_titulos_id_fk" FOREIGN KEY ("titulo_id") REFERENCES "public"."titulos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titulo_validacoes" ADD CONSTRAINT "titulo_validacoes_servidor_id_servidores_id_fk" FOREIGN KEY ("servidor_id") REFERENCES "public"."servidores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titulo_validacoes" ADD CONSTRAINT "titulo_validacoes_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."imports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titulos" ADD CONSTRAINT "titulos_programa_id_programas_id_fk" FOREIGN KEY ("programa_id") REFERENCES "public"."programas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titulos" ADD CONSTRAINT "titulos_intervalo_id_programa_intervalos_id_fk" FOREIGN KEY ("intervalo_id") REFERENCES "public"."programa_intervalos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titulos" ADD CONSTRAINT "titulos_comunidade_id_comunidades_id_fk" FOREIGN KEY ("comunidade_id") REFERENCES "public"."comunidades"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titulos" ADD CONSTRAINT "titulos_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."imports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_comunidades_nome" ON "comunidades" USING btree ("nome_canonico");--> statement-breakpoint
CREATE INDEX "ix_comunidades_municipio" ON "comunidades" USING btree ("municipio");--> statement-breakpoint
CREATE INDEX "ix_imports_criado_em" ON "imports" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "ix_imports_programa" ON "imports" USING btree ("programa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_intervalos_programa_ordem" ON "programa_intervalos" USING btree ("programa_id","ordem");--> statement-breakpoint
CREATE INDEX "ix_intervalos_data_inicio" ON "programa_intervalos" USING btree ("data_inicio");--> statement-breakpoint
CREATE INDEX "ix_intervalos_data_fim" ON "programa_intervalos" USING btree ("data_fim");--> statement-breakpoint
CREATE INDEX "ix_validacoes_titulo" ON "titulo_validacoes" USING btree ("titulo_id","data");--> statement-breakpoint
CREATE INDEX "ix_validacoes_status" ON "titulo_validacoes" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_titulo_dedup" ON "titulos" USING btree ("processo_sei","comunidade_id","data_assinatura") WHERE "titulos"."processo_sei" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ix_titulos_intervalo" ON "titulos" USING btree ("intervalo_id");--> statement-breakpoint
CREATE INDEX "ix_titulos_comunidade" ON "titulos" USING btree ("comunidade_id");--> statement-breakpoint
CREATE INDEX "ix_titulos_data" ON "titulos" USING btree ("data_assinatura");--> statement-breakpoint
CREATE INDEX "ix_titulos_car" ON "titulos" USING btree ("car_status");--> statement-breakpoint
CREATE INDEX "ix_titulos_recibo" ON "titulos" USING btree ("recibo_car");--> statement-breakpoint
CREATE INDEX "ix_titulos_programa_intervalo" ON "titulos" USING btree ("programa_id","intervalo_id");