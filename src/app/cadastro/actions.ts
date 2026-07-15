"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const DOMINIOS_PERMITIDOS = ["gmail.com", "semarh.gov.br"] as const;

const cadastroSchema = z.object({
  nome: z.string().trim().min(3, "Nome muito curto.").max(120),
  email: z.string().trim().toLowerCase().email("Email inválido."),
  matricula: z.string().trim().max(40).optional().or(z.literal("")),
  cargo: z.string().trim().max(120).optional().or(z.literal("")),
  senha: z.string().min(8, "Senha precisa de no mínimo 8 caracteres.").max(128),
});

export type CadastroResult =
  | { ok: true }
  | { ok: false; error: string };

export async function cadastroAction(
  input: z.input<typeof cadastroSchema>,
): Promise<CadastroResult> {
  const parsed = cadastroSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { nome, email, matricula, cargo, senha } = parsed.data;

  const dominio = email.split("@")[1];
  if (!dominio || !DOMINIOS_PERMITIDOS.includes(dominio as (typeof DOMINIOS_PERMITIDOS)[number])) {
    return {
      ok: false,
      error: "Domínio de email não permitido. Use @gmail.com ou @semarh.gov.br.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: {
        nome,
        matricula: matricula || null,
        cargo: cargo || null,
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { ok: false, error: "Já existe uma conta com esse email." };
    }
    return { ok: false, error: "Não foi possível concluir o cadastro. Tente novamente." };
  }

  return { ok: true };
}
