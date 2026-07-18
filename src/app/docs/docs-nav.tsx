"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { DocMeta } from "@/lib/docs/metodologia";

/** Navegação lateral do ambiente `/docs`, com destaque do item ativo. */
export function DocsNav({ docs }: { docs: readonly DocMeta[] }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {docs.map((d) => {
        const href = `/docs/${d.slug}`;
        const ativo = pathname === href;
        return (
          <Link
            key={d.slug}
            href={href}
            className={`block rounded-lg px-3 py-2 text-[13px] transition-colors ${
              ativo
                ? "bg-[var(--surface)] font-medium text-[var(--text)]"
                : "text-[var(--text-muted)] hover:bg-[var(--surface)]/60 hover:text-[var(--text)]"
            }`}
          >
            {d.titulo}
            <span className="mt-0.5 block text-[11px] leading-tight text-[var(--text-subtle)]">
              {d.descricao}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
