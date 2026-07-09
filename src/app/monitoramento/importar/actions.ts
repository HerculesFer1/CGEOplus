"use server";

import { revalidatePath } from "next/cache";

import {
  parsePlanilha,
  type ParseResult,
} from "@/lib/monitoramento/planilha-parser";
import {
  buildPreview,
  commitImport,
  type ImportCommitStats,
  type ImportPreview,
} from "@/lib/monitoramento/importer";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface PreviewPayload {
  parse: {
    linhas: number;
    erros: number;
    abasProcessadas: string[];
    abasIgnoradas: string[];
    errosAmostra: { aba: string; linhaNumero: number; problema: string }[];
  };
  preview: ImportPreview;
}

async function toBuffer(fd: FormData): Promise<{ buffer: Buffer; name: string } | null> {
  const file = fd.get("file");
  if (!(file instanceof File)) return null;
  const arr = await file.arrayBuffer();
  return { buffer: Buffer.from(arr), name: file.name };
}

function getSigla(fd: FormData): string | null {
  const s = fd.get("programaSigla");
  if (typeof s !== "string" || !s.trim()) return null;
  return s.trim();
}

export async function previewImportAction(
  fd: FormData,
): Promise<ActionResult<PreviewPayload>> {
  const buf = await toBuffer(fd);
  if (!buf) return { ok: false, error: "Arquivo não enviado." };
  const sigla = getSigla(fd);
  if (!sigla) return { ok: false, error: "Programa não selecionado." };

  let parsed: ParseResult;
  try {
    parsed = parsePlanilha(buf.buffer);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao ler planilha.",
    };
  }

  if (parsed.linhas.length === 0) {
    return {
      ok: false,
      error:
        "Nenhuma linha válida encontrada. Verifique se o arquivo contém abas de detalhe (PSI YYYY / INTERVALO N).",
    };
  }

  try {
    const preview = await buildPreview(parsed.linhas, sigla);
    return {
      ok: true,
      data: {
        parse: {
          linhas: parsed.linhas.length,
          erros: parsed.erros.length,
          abasProcessadas: parsed.abasProcessadas,
          abasIgnoradas: parsed.abasIgnoradas,
          errosAmostra: parsed.erros.slice(0, 10),
        },
        preview,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao montar preview.",
    };
  }
}

export async function commitImportAction(
  fd: FormData,
): Promise<ActionResult<ImportCommitStats>> {
  const buf = await toBuffer(fd);
  if (!buf) return { ok: false, error: "Arquivo não enviado." };
  const sigla = getSigla(fd);
  if (!sigla) return { ok: false, error: "Programa não selecionado." };

  try {
    const parsed = parsePlanilha(buf.buffer);
    const stats = await commitImport(parsed.linhas, sigla, buf.name, buf.buffer);
    revalidatePath("/monitoramento");
    revalidatePath("/monitoramento/importar");
    return { ok: true, data: stats };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro no commit.",
    };
  }
}
