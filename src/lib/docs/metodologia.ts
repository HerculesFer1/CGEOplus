/**
 * Índice da documentação de metodologia (ambiente `/docs`).
 *
 * ⚠️ REGRA DE SINCRONIA: este arquivo + os `.md` em `docs/metodologia/` são a
 * fonte da verdade da metodologia do sistema.
 *   - Mudou o método de um ambiente?  → atualize o `.md` correspondente
 *     (e o cabeçalho "Última revisão" dele).
 *   - Novo ambiente?  → crie o `.md` em `docs/metodologia/` E adicione a entrada
 *     aqui na ordem desejada.
 *
 * Os arquivos vivem em `docs/metodologia/` (fora de `src/`) e são lidos em runtime
 * via `fs`. O `next.config.ts` inclui esse diretório no bundle serverless através de
 * `outputFileTracingIncludes`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

export interface DocMeta {
  /** Segmento da URL: `/docs/<slug>`. */
  slug: string;
  /** Título curto exibido na navegação lateral. */
  titulo: string;
  /** Uma linha descrevendo o conteúdo (usada como subtítulo). */
  descricao: string;
  /** Nome do arquivo em `docs/metodologia/`. */
  arquivo: string;
}

export const DOCS_METODOLOGIA: readonly DocMeta[] = [
  {
    slug: "visao-geral",
    titulo: "Visão geral",
    descricao: "De onde vêm os dados e como chegam até a tela",
    arquivo: "00-visao-geral.md",
  },
  {
    slug: "mapbiomas",
    titulo: "MapBiomas Alerta",
    descricao: "Desmatamento detectado e o índice IPI",
    arquivo: "01-mapbiomas.md",
  },
  {
    slug: "prodes",
    titulo: "PRODES Cerrado",
    descricao: "Validação cruzada do desmatamento",
    arquivo: "02-prodes.md",
  },
  {
    slug: "queimadas",
    titulo: "Queimadas",
    descricao: "Área queimada, classes AHP e alerta CGEO+",
    arquivo: "03-queimadas.md",
  },
  {
    slug: "ipa",
    titulo: "IPA",
    descricao: "O índice de pressão ambiental composto",
    arquivo: "04-ipa.md",
  },
  {
    slug: "atualizacao-automatica",
    titulo: "Atualização automática",
    descricao: "Como o sistema se atualiza e como conferir",
    arquivo: "05-atualizacao-automatica.md",
  },
] as const;

export function getDocMeta(slug: string): DocMeta | undefined {
  return DOCS_METODOLOGIA.find((d) => d.slug === slug);
}

/** Lê o Markdown cru de um documento. Lança se o arquivo não existir. */
export async function readDocMarkdown(arquivo: string): Promise<string> {
  const full = path.join(process.cwd(), "docs", "metodologia", arquivo);
  return readFile(full, "utf8");
}
