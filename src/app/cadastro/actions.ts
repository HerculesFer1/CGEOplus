"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
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

  // Pré-check amigável: matrícula duplicada em profiles.
  // O índice único ux_profiles_matricula é a defesa final; este check só
  // troca o erro cru do Postgres por uma mensagem específica no UI.
  if (matricula) {
    const [colisao] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.matricula, matricula))
      .limit(1);
    if (colisao) {
      return {
        ok: false,
        error: `Matrícula ${matricula} já está cadastrada em outra conta.`,
      };
    }
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
