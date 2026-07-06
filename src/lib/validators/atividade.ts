import { z } from "zod";

export const COMPLEXIDADE = ["N1", "N2", "N3"] as const;

export const atividadeCreateSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, "Informe o nome da atividade.")
    .max(120),
  complexidade: z.enum(COMPLEXIDADE, {
    message: "Selecione a complexidade.",
  }),
  nucleoId: z
    .string()
    .uuid("Selecione um núcleo válido.")
    .optional()
    .or(z.literal("")),
  descricao: z
    .string()
    .trim()
    .max(240)
    .optional()
    .or(z.literal("")),
  ativo: z.boolean(),
});

export const atividadeUpdateSchema = atividadeCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export type AtividadeCreateInput = z.infer<typeof atividadeCreateSchema>;
export type AtividadeUpdateInput = z.infer<typeof atividadeUpdateSchema>;
