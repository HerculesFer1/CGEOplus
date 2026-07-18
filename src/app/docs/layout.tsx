import Link from "next/link";
import { BookOpen } from "lucide-react";

import { DOCS_METODOLOGIA } from "@/lib/docs/metodologia";

import { DocsNav } from "./docs-nav";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 lg:flex-row">
      <aside className="lg:sticky lg:top-8 lg:h-fit lg:w-64 lg:shrink-0">
        <Link
          href="/docs"
          className="mb-3 flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]"
        >
          <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
          Documentação · Metodologia
        </Link>
        <DocsNav docs={DOCS_METODOLOGIA} />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
