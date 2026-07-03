CREATE TYPE "public"."complexidade" AS ENUM('N1', 'N2', 'N3');--> statement-breakpoint
CREATE TYPE "public"."resultado_analise" AS ENUM('Finalizado', 'Analisado com pendencia', 'Indeferido', 'Desarquivado');--> statement-breakpoint
CREATE TYPE "public"."setor_destino" AS ENUM('Concluido no setor', 'CGEO', 'FLORESTA', 'Licenciamento', 'SICAR');--> statement-breakpoint
CREATE TYPE "public"."sicar_finalidade" AS ENUM('Lancamento', 'Analise', 'Mapeamento');--> statement-breakpoint
CREATE TYPE "public"."sistema" AS ENUM('SEI', 'SIGA', 'SICAR');--> statement-breakpoint
CREATE TYPE "public"."status_processo" AS ENUM('em_analise', 'concluido', 'arquivado');--> statement-breakpoint
CREATE TYPE "public"."status_servidor" AS ENUM('ativo', 'inativo', 'afastado');--> statement-breakpoint
CREATE TYPE "public"."vinculo" AS ENUM('Efetivo', 'Consultor', 'Suporte');--> statement-breakpoint
CREATE TABLE "analises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"processo_id" uuid NOT NULL,
	"servidor_id" uuid NOT NULL,
	"atividade_id" uuid,
	"data_analise" date NOT NULL,
	"resultado" "resultado_analise" NOT NULL,
	"setor_destino" "setor_destino",
	"tempo_gasto_min" integer,
	"observacoes" text,
	"numero_ordem" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "atividades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"complexidade" "complexidade" NOT NULL,
	"nucleo_id" uuid,
	"descricao" text,
	"ativo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nucleos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"cor_tema" text,
	"min_membros" smallint DEFAULT 2 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "nucleos_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE "processos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" text NOT NULL,
	"sistema" "sistema" NOT NULL,
	"sicar_finalidade" "sicar_finalidade",
	"requerente" text,
	"municipio" text,
	"data_entrada" date NOT NULL,
	"status_atual" "status_processo" DEFAULT 'em_analise' NOT NULL,
	"observacoes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_sicar_finalidade" CHECK (("processos"."sistema" = 'SICAR' AND "processos"."sicar_finalidade" IS NOT NULL)
        OR ("processos"."sistema" <> 'SICAR' AND "processos"."sicar_finalidade" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "servidor_nucleo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"servidor_id" uuid NOT NULL,
	"nucleo_id" uuid NOT NULL,
	"is_principal" boolean DEFAULT false NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim" date,
	"motivo" text,
	CONSTRAINT "chk_data_fim_valida" CHECK ("servidor_nucleo"."data_fim" IS NULL OR "servidor_nucleo"."data_fim" >= "servidor_nucleo"."data_inicio")
);
--> statement-breakpoint
CREATE TABLE "servidores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"apelido" text,
	"matricula" text,
	"email" text NOT NULL,
	"cargo" text NOT NULL,
	"tipo_vinculo" "vinculo" NOT NULL,
	"especialidade" text,
	"data_ingresso" date NOT NULL,
	"status" "status_servidor" DEFAULT 'ativo' NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "servidores_matricula_unique" UNIQUE("matricula"),
	CONSTRAINT "servidores_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "analises" ADD CONSTRAINT "analises_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analises" ADD CONSTRAINT "analises_servidor_id_servidores_id_fk" FOREIGN KEY ("servidor_id") REFERENCES "public"."servidores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analises" ADD CONSTRAINT "analises_atividade_id_atividades_id_fk" FOREIGN KEY ("atividade_id") REFERENCES "public"."atividades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_nucleo_id_nucleos_id_fk" FOREIGN KEY ("nucleo_id") REFERENCES "public"."nucleos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processos" ADD CONSTRAINT "processos_created_by_servidores_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."servidores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servidor_nucleo" ADD CONSTRAINT "servidor_nucleo_servidor_id_servidores_id_fk" FOREIGN KEY ("servidor_id") REFERENCES "public"."servidores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servidor_nucleo" ADD CONSTRAINT "servidor_nucleo_nucleo_id_nucleos_id_fk" FOREIGN KEY ("nucleo_id") REFERENCES "public"."nucleos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_analises_data" ON "analises" USING btree ("data_analise");--> statement-breakpoint
CREATE INDEX "ix_analises_servidor" ON "analises" USING btree ("servidor_id","data_analise");--> statement-breakpoint
CREATE INDEX "ix_analises_processo" ON "analises" USING btree ("processo_id","numero_ordem");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_processos_numero_sistema" ON "processos" USING btree ("numero","sistema");--> statement-breakpoint
CREATE INDEX "ix_processos_data_entrada" ON "processos" USING btree ("data_entrada");--> statement-breakpoint
CREATE INDEX "ix_processos_sistema" ON "processos" USING btree ("sistema");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_servidor_nucleo_principal_ativo" ON "servidor_nucleo" USING btree ("servidor_id") WHERE "servidor_nucleo"."is_principal" AND "servidor_nucleo"."data_fim" IS NULL;--> statement-breakpoint
CREATE INDEX "ix_servidores_apelido" ON "servidores" USING btree ("apelido");