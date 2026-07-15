"use client";

import Link from "next/link";
import { Presentation } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Botão do topbar que abre a rota `/apresentacao`. Fica ao lado do
 * ThemeToggle porque é um "modo" da UI (visualização para TV do setor),
 * não uma seção de conteúdo — decisão do usuário em 2026-07-14.
 */
export function PresentationButton({ className }: { className?: string }) {
  return (
    <Link
      href="/apresentacao"
      aria-label="Iniciar apresentação semanal"
      title="Apresentação (para TV do setor)"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full",
        "border bg-[var(--surface)] text-[var(--text)]",
        "transition-colors hover:bg-[var(--elevated)]",
        "focus-visible:outline-none",
        className,
      )}
    >
      <Presentation className="h-4 w-4" strokeWidth={1.75} />
    </Link>
  );
}
