import { notFound } from "next/navigation";

import { MarkdownView } from "@/components/docs/markdown-view";
import {
  DOCS_METODOLOGIA,
  getDocMeta,
  readDocMarkdown,
} from "@/lib/docs/metodologia";

export const runtime = "nodejs";

/** Pré-gera as rotas conhecidas; slug fora do índice → 404. */
export function generateStaticParams() {
  return DOCS_METODOLOGIA.map((d) => ({ slug: d.slug }));
}
export const dynamicParams = false;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const meta = getDocMeta(slug);
  if (!meta) notFound();

  const markdown = await readDocMarkdown(meta.arquivo);

  return (
    <article className="max-w-3xl">
      <MarkdownView>{markdown}</MarkdownView>
    </article>
  );
}
