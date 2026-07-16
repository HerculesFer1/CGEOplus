"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido."),
  senha: z.string().min(1, "Informe a senha."),
  next: z.string().optional(),
});

export type LoginResult = { ok: false; error: string };

function safeNext(raw: string | undefined): string {
  if (!raw) return "/dashboard";
  // Só paths internos; bloqueia protocol-relative (`//host`) e escape (`/\host`).
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) {
    return raw;
  }
  return "/dashboard";
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu email antes de entrar.";
  if (m.includes("too many requests") || m.includes("rate")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  }
  return "Não foi possível entrar. Tente novamente.";
}

export async function signInAction(
  input: z.input<typeof loginSchema>,
): Promise<LoginResult | void> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { email, senha, next } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    return { ok: false, error: translateAuthError(error.message) };
  }

  // Fora de try/catch: `redirect` lança NEXT_REDIRECT e o cookie já foi setado
  // no response HTTP desta Server Action, então a próxima request já vê a sessão.
  redirect(safeNext(next));
}
