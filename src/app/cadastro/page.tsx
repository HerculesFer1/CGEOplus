"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fadeSlideUp, staggerContainer } from "@/lib/design/motion";

import { cadastroAction } from "./actions";

export default function CadastroPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    matricula: "",
    cargo: "",
    senha: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await cadastroAction(form);
      if (res.ok) {
        toast.success("Cadastro enviado! Aguarde a aprovação do administrador.");
        router.push("/aguardando-aprovacao");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg)] px-6 py-16">
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
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para login
        </Link>
        <ThemeToggle />
      </header>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="w-full max-w-md"
      >
        <motion.div variants={fadeSlideUp} className="flex justify-center">
          <Logo size={32} />
        </motion.div>

        <motion.h1
          variants={fadeSlideUp}
          className="mt-8 text-center text-2xl font-semibold tracking-tight"
        >
          Solicitar acesso
        </motion.h1>
        <motion.p
          variants={fadeSlideUp}
          className="mt-2 text-center text-sm text-[var(--text-muted)]"
        >
          Preencha seus dados. O administrador vai revisar e liberar seu acesso.
        </motion.p>

        <motion.div
          variants={fadeSlideUp}
          className="mt-6 flex items-start gap-3 rounded-xl border bg-[var(--surface)] p-4"
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
          <p className="text-xs text-[var(--text-muted)]">
            Só emails <span className="font-medium text-[var(--text)]">@gmail.com</span>{" "}
            ou <span className="font-medium text-[var(--text)]">@semarh.gov.br</span> são
            aceitos. Seu cadastro fica pendente até o administrador aprovar.
          </p>
        </motion.div>

        <motion.form
          variants={fadeSlideUp}
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-4"
        >
          <Field label="Nome completo" htmlFor="nome" required>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => update("nome", e.target.value)}
              placeholder="Marco Aurelio"
              autoComplete="name"
              required
              disabled={isPending}
            />
          </Field>

          <Field label="Email" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="voce@gmail.com"
              autoComplete="email"
              required
              disabled={isPending}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Matrícula" htmlFor="matricula">
              <Input
                id="matricula"
                value={form.matricula}
                onChange={(e) => update("matricula", e.target.value)}
                placeholder="Opcional"
                disabled={isPending}
              />
            </Field>
            <Field label="Cargo" htmlFor="cargo">
              <Input
                id="cargo"
                value={form.cargo}
                onChange={(e) => update("cargo", e.target.value)}
                placeholder="Analista, Consultor..."
                disabled={isPending}
              />
            </Field>
          </div>

          <Field label="Senha" htmlFor="senha" required>
            <Input
              id="senha"
              type="password"
              value={form.senha}
              onChange={(e) => update("senha", e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={isPending}
            />
          </Field>

          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className="mt-2 w-full"
          >
            {isPending ? "Enviando..." : "Enviar solicitação"}
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
          Já tem cadastro?{" "}
          <Link
            href="/login"
            className="font-medium text-[var(--accent)] transition-colors hover:underline"
          >
            Entrar
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
      </Label>
      {children}
    </div>
  );
}
