import { z } from "zod";

export const nucleoCreateSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Informe o nome do núcleo.")
    .max(60, "Máximo 60 caracteres."),
  descricao: z
    .string()
    .trim()
    .max(240, "Máximo 240 caracteres.")
    .optional()
    .or(z.literal("")),
  corTema: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor em formato #RRGGBB.")
    .optional()
    .or(z.literal("")),
  minMembros: z
    .number()
    .int("Precisa ser inteiro.")
    .min(1, "Mínimo 1.")
    .max(50, "Máximo 50."),
  ativo: z.boolean(),
  membrosIds: z.array(z.string().uuid()),
});

export const nucleoUpdateSchema = nucleoCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export type NucleoCreateInput = z.infer<typeof nucleoCreateSchema>;
export type NucleoUpdateInput = z.infer<typeof nucleoUpdateSchema>;
