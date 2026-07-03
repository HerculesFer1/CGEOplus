import { z } from "zod";

/**
 * Schemas Zod para Processos e Análises.
 * Regra crítica: SICAR exige finalidade; SEI/SIGA proíbem.
 */

export const SISTEMAS = ["SEI", "SIGA", "SICAR", "SINAFLOR"] as const;
export const SICAR_FINALIDADES = ["Lancamento", "Analise", "Mapeamento"] as const;

export const RESULTADOS_ANALISE = [
  "Finalizado",
  "Analisado com pendencia",
  "Indeferido",
  "Desarquivado",
] as const;

export const SETORES_DESTINO = [
  "Concluido no setor",
  "CGEO",
  "FLORESTA",
  "Licenciamento",
  "SICAR",
] as const;

export const STATUS_PROCESSO = [
  "em_analise",
  "concluido",
  "arquivado",
] as const;

/** Regra do banco: se sistema=SICAR → finalidade obrigatória; senão proibida. */
export const processoCreateSchema = z
  .object({
    numero: z.string().trim().min(3, "Número do processo obrigatório.").max(120),
    sistema: z.enum(SISTEMAS, { message: "Selecione o sistema." }),
    sicarFinalidade: z.enum(SICAR_FINALIDADES).optional(),
    requerente: z.string().trim().max(200).optional().or(z.literal("")),
    municipio: z.string().trim().max(120).optional().or(z.literal("")),
    dataEntrada: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD."),
    observacoes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .refine(
    (v) =>
      (v.sistema === "SICAR" && !!v.sicarFinalidade) ||
      (v.sistema !== "SICAR" && !v.sicarFinalidade),
    {
      message:
        "Finalidade é obrigatória para SICAR e proibida para SEI/SIGA.",
      path: ["sicarFinalidade"],
    },
  );

export const processoUpdateSchema = z
  .object({
    id: z.string().uuid(),
    numero: z.string().trim().min(3).max(120).optional(),
    sistema: z.enum(SISTEMAS).optional(),
    sicarFinalidade: z.enum(SICAR_FINALIDADES).optional().nullable(),
    requerente: z.string().trim().max(200).optional().nullable(),
    municipio: z.string().trim().max(120).optional().nullable(),
    dataEntrada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    statusAtual: z.enum(STATUS_PROCESSO).optional(),
    observacoes: z.string().trim().max(2000).optional().nullable(),
  });

export const analiseCreateSchema = z.object({
  processoId: z.string().uuid(),
  servidorId: z.string().uuid(),
  atividadeId: z.string().uuid().optional().nullable(),
  dataAnalise: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD."),
  resultado: z.enum(RESULTADOS_ANALISE, {
    message: "Selecione o resultado.",
  }),
  setorDestino: z.enum(SETORES_DESTINO).optional().nullable(),
  tempoGastoMin: z.number().int().min(0).max(1440).optional().nullable(),
  observacoes: z.string().trim().max(2000).optional().or(z.literal("")),
});

/**
 * Registrar análise a partir do modelo mental da planilha:
 * uma linha por análise, com número do processo + sistema.
 */
export const analiseFromPlanilhaSchema = z.object({
  numeroProcesso: z.string().trim().min(3, "Número do processo obrigatório."),
  sistema: z.enum(SISTEMAS),
  sicarFinalidade: z.enum(SICAR_FINALIDADES).optional().nullable(),
  servidorId: z.string().uuid("Selecione o analista."),
  dataAnalise: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  resultado: z.enum(RESULTADOS_ANALISE),
  setorDestino: z.enum(SETORES_DESTINO).optional().nullable(),
  observacoes: z.string().trim().max(2000).optional().or(z.literal("")),
}).refine(
  (v) =>
    (v.sistema === "SICAR" && !!v.sicarFinalidade) ||
    (v.sistema !== "SICAR" && !v.sicarFinalidade),
  {
    message: "Finalidade é obrigatória para SICAR e proibida para SEI/SIGA.",
    path: ["sicarFinalidade"],
  },
);

export type ProcessoCreateInput = z.infer<typeof processoCreateSchema>;
export type ProcessoUpdateInput = z.infer<typeof processoUpdateSchema>;
export type AnaliseCreateInput = z.infer<typeof analiseCreateSchema>;
export type AnaliseFromPlanilhaInput = z.infer<typeof analiseFromPlanilhaSchema>;
