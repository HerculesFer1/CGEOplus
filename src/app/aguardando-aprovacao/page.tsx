import { eq } from "drizzle-orm";
import { Clock, Mail } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

import { signOutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AguardandoAprovacaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  // Se já foi aprovado, não faz sentido ficar aqui.
  if (profile?.approved) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg)] px-6">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, var(--accent), transparent)",
          filter: "blur(80px)",
        }}
      />

      <header className="fixed inset-x-0 top-0 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo size={24} />
        <ThemeToggle />
      </header>

      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border bg-[var(--surface)]">
          <Clock className="h-6 w-6 text-[var(--accent)]" />
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          Cadastro sob análise
        </h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Recebemos sua solicitação de acesso. O administrador do CGEO+ vai
          revisar e liberar seu perfil em breve.
        </p>

        <div className="mt-8 rounded-xl border bg-[var(--surface)] p-5 text-left">
          <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)]">
            Cadastro
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-sm font-medium text-[var(--text)]">
              {profile?.nome ?? user.email}
            </p>
            <p className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Mail className="h-3 w-3" />
              {user.email}
            </p>
          </div>
        </div>

        <p className="mt-6 text-xs text-[var(--text-subtle)]">
          Você não vai receber email — quando o acesso for liberado, é só voltar
          e entrar normalmente.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              Sair
            </Button>
          </form>
          <Link href="/">
            <Button variant="ghost">Início</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
