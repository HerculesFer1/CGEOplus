import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renderiza Markdown (GFM) usando os tokens de design do CGEO+ — sem depender do
 * plugin `prose`. Usado no ambiente `/docs`. Componente de servidor (sem estado).
 *
 * Links internos (slugs relativos como `ipa`) são resolvidos para `/docs/<slug>`;
 * links externos (`http…`) abrem em nova aba.
 */
export function MarkdownView({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: (p) => (
          <h1 className="mt-2 mb-4 text-3xl font-semibold tracking-tight text-[var(--text)]" {...p} />
        ),
        h2: (p) => (
          <h2 className="mt-9 mb-3 border-b border-[var(--border)] pb-1.5 text-xl font-semibold tracking-tight text-[var(--text)]" {...p} />
        ),
        h3: (p) => (
          <h3 className="mt-6 mb-2 text-base font-semibold text-[var(--text)]" {...p} />
        ),
        h4: (p) => (
          <h4 className="mt-5 mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-subtle)]" {...p} />
        ),
        p: (p) => (
          <p className="my-3 text-[14px] leading-relaxed text-[var(--text-muted)]" {...p} />
        ),
        ul: (p) => (
          <ul className="my-3 ml-5 list-disc space-y-1.5 text-[14px] leading-relaxed text-[var(--text-muted)] marker:text-[var(--text-subtle)]" {...p} />
        ),
        ol: (p) => (
          <ol className="my-3 ml-5 list-decimal space-y-1.5 text-[14px] leading-relaxed text-[var(--text-muted)] marker:text-[var(--text-subtle)]" {...p} />
        ),
        li: (p) => <li className="pl-1" {...p} />,
        a: ({ href = "", ...rest }: ComponentPropsWithoutRef<"a">) => {
          const externo = /^https?:/i.test(href);
          const destino = externo || href.startsWith("/") || href.startsWith("#")
            ? href
            : `/docs/${href}`;
          return (
            <a
              href={destino}
              className="font-medium text-[var(--accent,#3b82f6)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-current"
              {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              {...rest}
            />
          );
        },
        strong: (p) => <strong className="font-semibold text-[var(--text)]" {...p} />,
        em: (p) => <em className="italic" {...p} />,
        blockquote: (p) => (
          <blockquote className="my-4 rounded-r-lg border-l-2 border-[var(--border)] bg-[var(--surface)]/60 py-2 pl-4 pr-3 text-[13px] text-[var(--text-muted)] [&>p]:my-1" {...p} />
        ),
        hr: (p) => <hr className="my-6 border-[var(--border)]" {...p} />,
        code: (p) => (
          <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[12.5px] text-[var(--text)]" {...p} />
        ),
        pre: (p) => (
          <pre className="my-4 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-[12.5px] leading-relaxed text-[var(--text)] [&_code]:bg-transparent [&_code]:p-0" {...p} />
        ),
        table: (p) => (
          <div className="my-4 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full border-collapse text-[13px]" {...p} />
          </div>
        ),
        thead: (p) => <thead className="bg-[var(--surface)]" {...p} />,
        th: (p) => (
          <th className="border-b border-[var(--border)] px-3 py-2 text-left font-semibold text-[var(--text)]" {...p} />
        ),
        td: (p) => (
          <td className="border-b border-[var(--border)]/60 px-3 py-2 align-top text-[var(--text-muted)]" {...p} />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
