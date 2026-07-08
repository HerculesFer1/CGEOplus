import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg)] px-6 text-[var(--text)]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-25"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, var(--accent), transparent)",
          filter: "blur(80px)",
        }}
      />

      <div className="w-full max-w-md text-center">
        <div className="mx-auto inline-flex">
          <Logo size={24} />
        </div>

        <div className="mt-10 inline-flex h-14 w-14 items-center justify-center rounded-full border bg-[var(--elevated)] shadow-[var(--shadow-sm)]">
          <Compass className="h-6 w-6 text-[var(--accent)]" strokeWidth={1.5} />
        </div>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight sm:text-3xl">
          Página não encontrada
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-[var(--text-muted)]">
          A rota que você tentou acessar não existe ou foi movida. Verifique o
          endereço ou volte para uma área conhecida.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Ir para o dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            Página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}
