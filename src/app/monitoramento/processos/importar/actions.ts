"use server";

import { revalidatePath } from "next/cache";

import { parsePlanilha, type ParseResult } from "@/lib/import/planilha-parser";
import { buildAnalistaMap, executarImport, type ImportStats } from "@/lib/import/importer";

export interface AnalisePreview {
  aba: string;
  linhaNumero: number;
  dataAnalise: string;
  sistema: string;
  finalidade: string | null;
  numeroProcesso: string;
  analistaApelido: string;
  analistaMatched: boolean;
  resultado: string;
  setorDestino: string | null;
}

export interface PreviewResult {
  ok: true;
  totalLinhasValidas: number;
  totalErros: number;
  abasProcessadas: string[];
  abasIgnoradas: string[];
  amostra: AnalisePreview[];
  errosAmostra: { aba: string; linhaNumero: number; problema: string }[];
  analistasNaoCadastrados: string[];
  processosUnicos: number;
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function toBuffer(fd: FormData): Promise<Buffer | null> {
  const file = fd.get("file");
  if (!(file instanceof File)) return null;
  const arr = await file.arrayBuffer();
  return Buffer.from(arr);
}

export async function previewImportAction(
  fd: FormData,
): Promise<ActionResult<PreviewResult>> {
  const buffer = await toBuffer(fd);
  if (!buffer) return { ok: false, error: "Arquivo não enviado." };

  let parsed: ParseResult;
  try {
    parsed = parsePlanilha(buffer);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao ler planilha.",
    };
  }

  const analistaMap = await buildAnalistaMap();

  const naoCadastrados = new Set<string>();
  for (const l of parsed.linhas) {
    if (!analistaMap.has(l.analistaApelido.trim().toLowerCase())) {
      naoCadastrados.add(l.analistaApelido);
    }
  }

  const processosUnicos = new Set(
    parsed.linhas.map((l) => `${l.numeroProcesso}::${l.sistema}`),
  ).size;

  return {
    ok: true,
    data: {
      ok: true,
      totalLinhasValidas: parsed.linhas.length,
      totalErros: parsed.erros.length,
      abasProcessadas: parsed.abasProcessadas,
      abasIgnoradas: parsed.abasIgnoradas,
      amostra: parsed.linhas.slice(0, 20).map((l) => ({
        aba: l.aba,
        linhaNumero: l.linhaNumero,
        dataAnalise: l.dataAnalise,
        sistema: l.sistema,
        finalidade: l.sicarFinalidade,
        numeroProcesso: l.numeroProcesso,
        analistaApelido: l.analistaApelido,
        analistaMatched: analistaMap.has(
          l.analistaApelido.trim().toLowerCase(),
        ),
        resultado: l.resultado,
        setorDestino: l.setorDestino,
      })),
      errosAmostra: parsed.erros.slice(0, 20).map((e) => ({
        aba: e.aba,
        linhaNumero: e.linhaNumero,
        problema: e.problema,
      })),
      analistasNaoCadastrados: Array.from(naoCadastrados).sort(),
      processosUnicos,
    },
  };
}

export async function commitImportAction(
  fd: FormData,
): Promise<ActionResult<ImportStats>> {
  const buffer = await toBuffer(fd);
  if (!buffer) return { ok: false, error: "Arquivo não enviado." };

  try {
    const parsed = parsePlanilha(buffer);
    const analistaMap = await buildAnalistaMap();
    const stats = await executarImport(parsed.linhas, analistaMap);
    revalidatePath("/monitoramento/processos");
    return { ok: true, data: stats };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro inesperado no import.",
    };
  }
}
