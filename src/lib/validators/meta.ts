import { z } from "zod";

export const META_PERIODO = ["mensal", "semanal"] as const;
export const META_ESCOPO = [
  "institucional",
  "nucleo",
  "servidor",
  "sistema",
  "atividade",
] as const;
export const META_METRICA = [
  "analises_registradas",
  "analises_finalizadas",
  "taxa_finalizacao",
  "processos_concluidos",
] as const;
export const META_SISTEMA = ["SEI", "SIGA", "SICAR", "SINAFLOR"] as const;

export type MetaPeriodo = (typeof META_PERIODO)[number];
export type MetaEscopo = (typeof META_ESCOPO)[number];
export type MetaMetrica = (typeof META_METRICA)[number];
export type MetaSistema = (typeof META_SISTEMA)[number];

export const META_METRICA_LABEL: Record<MetaMetrica, string> = {
  analises_registradas: "Análises registradas",
  analises_finalizadas: "Análises finalizadas",
  taxa_finalizacao: "Taxa de finalização",
  processos_concluidos: "Processos concluídos",
};

export const META_ESCOPO_LABEL: Record<MetaEscopo, string> = {
  institucional: "Institucional",
  nucleo: "Núcleo",
  servidor: "Servidor",
  sistema: "Sistema",
  atividade: "Atividade",
};

export const metaCreateSchema = z
  .object({
    periodo: z.enum(META_PERIODO),
    escopo: z.enum(META_ESCOPO),
    alvoId: z
      .string()
      .uuid("Alvo inválido.")
      .optional()
      .or(z.literal("")),
    alvoSistema: z.enum(META_SISTEMA).optional().or(z.literal("")),
    metrica: z.enum(META_METRICA),
    valorAlvo: z.coerce
      .number({ message: "Informe o valor da meta." })
      .positive("Meta deve ser maior que zero."),
    ano: z.coerce
      .number()
      .int()
      .min(2020)
      .max(2100),
    mes: z.coerce.number().int().min(1).max(12).optional().nullable(),
    semanaIso: z.coerce.number().int().min(1).max(53).optional().nullable(),
    observacao: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // Coerência de período
    if (data.periodo === "mensal") {
      if (!data.mes) {
        ctx.addIssue({
          code: "custom",
          path: ["mes"],
          message: "Selecione o mês.",
        });
      }
      if (data.semanaIso) {
        ctx.addIssue({
          code: "custom",
          path: ["semanaIso"],
          message: "Meta mensal não usa semana.",
        });
      }
    } else {
      if (!data.semanaIso) {
        ctx.addIssue({
          code: "custom",
          path: ["semanaIso"],
          message: "Selecione a semana ISO.",
        });
      }
      if (data.mes) {
        ctx.addIssue({
          code: "custom",
          path: ["mes"],
          message: "Meta semanal não usa mês.",
        });
      }
    }

    // Coerência de escopo × alvo
    if (data.escopo === "institucional") {
      if (data.alvoId || data.alvoSistema) {
        ctx.addIssue({
          code: "custom",
          path: ["escopo"],
          message: "Meta institucional não tem alvo específico.",
        });
      }
    } else if (data.escopo === "sistema") {
      if (!data.alvoSistema) {
        ctx.addIssue({
          code: "custom",
          path: ["alvoSistema"],
          message: "Selecione o sistema.",
        });
      }
      if (data.alvoId) {
        ctx.addIssue({
          code: "custom",
          path: ["alvoId"],
          message: "Meta de sistema não usa alvo por ID.",
        });
      }
    } else {
      // nucleo | servidor | atividade
      if (!data.alvoId) {
        ctx.addIssue({
          code: "custom",
          path: ["alvoId"],
          message: `Selecione o ${data.escopo}.`,
        });
      }
      if (data.alvoSistema) {
        ctx.addIssue({
          code: "custom",
          path: ["alvoSistema"],
          message: "Alvo por ID já selecionado.",
        });
      }
    }

    // Taxa % <= 100
    if (data.metrica === "taxa_finalizacao" && data.valorAlvo > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["valorAlvo"],
        message: "Taxa não pode passar de 100%.",
      });
    }
  });

export const metaUpdateSchema = z
  .object({
    id: z.string().uuid(),
    valorAlvo: z.coerce.number().positive().optional(),
    observacao: z.string().trim().max(500).optional().or(z.literal("")),
  });

export type MetaCreateInput = z.infer<typeof metaCreateSchema>;
export type MetaUpdateInput = z.infer<typeof metaUpdateSchema>;
