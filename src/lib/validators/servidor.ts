import { z } from "zod";

/**
 * Schemas Zod para Servidores.
 * Compartilhados entre formulários (client) e services (server).
 */

export const TIPO_VINCULO = ["Efetivo", "Consultor", "Suporte"] as const;
export const STATUS_SERVIDOR = ["ativo", "inativo", "afastado"] as const;

export const NUCLEO_NAMES = [
  "Coordenacao",
  "Licenciamento",
  "CAR",
  "Fiscalizacao",
  "Administrativo",
] as const;

export const servidorCreateSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, "Informe o nome completo (mínimo 3 caracteres).")
    .max(120),
  apelido: z
    .string()
    .trim()
    .min(2, "Apelido usado na planilha (ex.: Marco, Tereza).")
    .max(40),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  matricula: z.string().trim().max(30).optional().or(z.literal("")),
  cargo: z.string().trim().min(3, "Cargo obrigatório.").max(120),
  tipoVinculo: z.enum(TIPO_VINCULO, {
    message: "Selecione o tipo de vínculo.",
  }),
  especialidade: z.string().trim().max(120).optional().or(z.literal("")),
  dataIngresso: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD."),
  status: z.enum(STATUS_SERVIDOR),
  nucleoPrincipal: z.enum(NUCLEO_NAMES, {
    message: "Selecione o núcleo principal.",
  }),
});

export const servidorUpdateSchema = servidorCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export type ServidorCreateInput = z.infer<typeof servidorCreateSchema>;
export type ServidorUpdateInput = z.infer<typeof servidorUpdateSchema>;
