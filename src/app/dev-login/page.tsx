"use client";

import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useTransition } from "react";
import { ArrowLeft, Sparkles, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fadeSlideUp, staggerContainer, spring } from "@/lib/design/motion";
import { TEST_USERS } from "@/lib/auth/test-users";

import { loginAsTestUserAction } from "./actions";

export default function DevLoginPage() {
  return (
    <Suspense fallback={null}>
      <DevLoginContent />
    </Suspense>
  );
}

function DevLoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const next = params.get("next") ?? "/dashboard";

  function handleLogin(userId: string) {
    startTransition(async () => {
      const res = await loginAsTestUserAction(userId);
      if (res.ok) {
        toast.success(`Entrando como ${res.data.nome}`);
        router.push(next);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, var(--accent), transparent)",
          filter: "blur(80px)",
        }}
      />

      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Início
        </Link>
        <ThemeToggle />
      </header>

      <motion.main
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="mx-auto max-w-4xl px-6 pb-24"
      >
        <motion.div variants={fadeSlideUp} className="text-center">
          <Logo size={28} />
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border bg-[var(--surface)] px-3 py-1 text-xs text-[var(--warning)]">
            <ShieldAlert className="h-3.5 w-3.5" />
            Modo de teste — remover antes de produção
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
            Entrar como usuário de teste
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--text-muted)]">
            Enquanto o Google OAuth institucional não estiver configurado,
            escolha um perfil para explorar o sistema. As sessões duram 12h e
            são armazenadas em cookie assinado.
          </p>
        </motion.div>

        <motion.div variants={staggerContainer} className="mt-10 grid gap-3 sm:grid-cols-2">
          {TEST_USERS.map((user) => (
            <motion.button
              key={user.id}
              type="button"
              variants={fadeSlideUp}
              whileHover={{ y: -2 }}
              transition={spring.gentle}
              onClick={() => handleLogin(user.id)}
              disabled={isPending}
              className="group flex flex-col items-start gap-3 rounded-2xl border bg-[var(--elevated)] p-5 text-left shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)] disabled:opacity-50"
            >
              <div className="flex w-full items-start justify-between">
                <div
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: user.cor }}
                >
                  <Sparkles className="h-4 w-4" strokeWidth={2} />
                </div>
                <Badge variant="outline">{user.papel}</Badge>
              </div>
              <div>
                <p className="font-semibold">{user.nome}</p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {user.email}
                </p>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                {user.descricao}
              </p>
              <span className="mt-auto text-xs font-medium text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100">
                Entrar →
              </span>
            </motion.button>
          ))}
        </motion.div>

        <motion.p
          variants={fadeSlideUp}
          className="mt-10 text-center text-xs text-[var(--text-subtle)]"
        >
          Já configurou Google OAuth?{" "}
          <Link href="/login" className="underline hover:text-[var(--text)]">
            Ir para login institucional
          </Link>
        </motion.p>
      </motion.main>
    </div>
  );
}
