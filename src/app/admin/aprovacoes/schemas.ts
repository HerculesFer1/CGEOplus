import { z } from "zod";

import { TIPO_VINCULO } from "@/lib/validators/servidor";

/**
 * Dados que o admin fornece ao aprovar um perfil pendente.
 * Nome/email/matricula/cargo vêm do próprio `profiles`; os campos abaixo
 * são o que falta para materializar uma linha em `public.servidores`.
 *
 * `apelido` é obrigatório porque a planilha e vários componentes da UI
 * (analistas, badges) usam esse campo curto como identidade de trabalho.
 *
 * `nucleoId` é opcional: no bootstrap pós-limpeza o catálogo de núcleos
 * pode estar vazio, e o admin edita o vínculo depois em /servidores.
 */
export const aprovarPerfilInputSchema = z.object({
  perfilId: z.string().uuid(),
  role: z.enum(["admin", "servidor"]),
  apelido: z
    .string()
    .trim()
    .min(2, "Apelido curto usado na interface (ex.: Marco, Tereza).")
    .max(40),
  cargo: z.string().trim().min(3, "Cargo obrigatório.").max(120),
  tipoVinculo: z.enum(TIPO_VINCULO, {
    message: "Selecione o tipo de vínculo.",
  }),
  dataIngresso: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD."),
  nucleoId: z.string().uuid().nullable().optional(),
});

export type AprovarPerfilInput = z.infer<typeof aprovarPerfilInputSchema>;

/**
 * Mesmo shape, sem o `role` (perfil já aprovado; só falta criar o vínculo
 * com o catálogo operacional).
 */
export const vincularServidorInputSchema = aprovarPerfilInputSchema.omit({
  role: true,
});

export type VincularServidorInput = z.infer<typeof vincularServidorInputSchema>;
