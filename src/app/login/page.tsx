"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fadeSlideUp, staggerContainer } from "@/lib/design/motion";

import { signInAction } from "./actions";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signInAction({ email, senha, next });
      // Sucesso: a Server Action faz redirect(); a transição segue e desmonta a tela.
      // Erro: retorna { ok: false, error } e mostramos aqui.
      if (res && !res.ok) {
        setError(res.error);
      }
    });
  }

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
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <ThemeToggle />
      </header>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="w-full max-w-sm"
      >
        <motion.div variants={fadeSlideUp} className="flex justify-center">
          <Logo size={32} />
        </motion.div>

        <motion.h1
          variants={fadeSlideUp}
          className="mt-8 text-center text-2xl font-semibold tracking-tight"
        >
          Bem-vindo(a) de volta
        </motion.h1>
        <motion.p
          variants={fadeSlideUp}
          className="mt-2 text-center text-sm text-[var(--text-muted)]"
        >
          Acesse com sua conta do CGEO+
        </motion.p>

        <motion.form
          variants={fadeSlideUp}
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@gmail.com"
                className="pl-9"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="senha">Senha</Label>
              <Link
                href="/esqueci-senha"
                className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
              >
                Esqueci minha senha
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
                disabled={isPending}
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className="mt-2 w-full"
          >
            {isPending ? "Entrando..." : "Entrar"}
          </Button>

          {error && (
            <p
              role="alert"
              className="text-center text-sm text-[var(--danger)]"
            >
              {error}
            </p>
          )}
        </motion.form>

        <motion.p
          variants={fadeSlideUp}
          className="mt-6 text-center text-sm text-[var(--text-muted)]"
        >
          Ainda não tem cadastro?{" "}
          <Link
            href="/cadastro"
            className="font-medium text-[var(--accent)] transition-colors hover:underline"
          >
            Solicitar acesso
          </Link>
        </motion.p>

        <motion.p
          variants={fadeSlideUp}
          className="mt-8 text-center text-xs text-[var(--text-subtle)]"
        >
          Ao continuar, você aceita as políticas de uso institucional da SEMARH.
        </motion.p>
      </motion.div>
    </div>
  );
}
