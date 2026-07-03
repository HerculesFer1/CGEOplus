"use client";

import { Search, Command } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/brand/logo";

export function Topbar() {
  return (
    <header
      className={
        "sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-[var(--bg)]/80 px-4 backdrop-blur-xl lg:px-8"
      }
    >
      {/* Logo aparece só no mobile (sidebar oculta) */}
      <div className="lg:hidden">
        <Logo size={18} />
      </div>

      {/* Barra de busca / Command palette trigger */}
      <button
        type="button"
        className="ml-auto inline-flex h-9 w-full max-w-sm items-center gap-2 rounded-full border bg-[var(--surface)] px-4 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        aria-label="Abrir busca"
      >
        <Search className="h-4 w-4" strokeWidth={1.75} />
        <span className="flex-1 text-left">Buscar processo, servidor…</span>
        <kbd className="inline-flex items-center gap-0.5 rounded border bg-[var(--elevated)] px-1.5 py-0.5 font-mono text-[10px]">
          <Command className="h-3 w-3" strokeWidth={2} />K
        </kbd>
      </button>

      <ThemeToggle />
    </header>
  );
}
