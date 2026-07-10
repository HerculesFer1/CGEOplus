/**
 * POST /api/car/importar/parse
 *
 * Recebe { storagePath, ano, mes } (JSON). Baixa o CSV do bucket `car-imports`
 * do Supabase Storage (uploaded pelo cliente via URL assinada), parseia,
 * classifica e devolve o preview.
 */

import { NextResponse } from "next/server";

import {
  buildCarPreview,
  type ExistingImportInfo,
} from "@/lib/car/importer";
import { downloadCarImport } from "@/lib/car/storage";
import { CarParseError, type CarPreview } from "@/lib/car/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export interface CarPreviewPayload {
  preview: CarPreview;
  encoding: "utf-8" | "windows-1252";
  totalLinhas: number;
  linhasDescartadas: number;
  existente: ExistingImportInfo | null;
  storagePath: string;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { storagePath?: string; ano?: number; mes?: number }
    | null;
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "JSON inválido." },
      { status: 400 },
    );
  }
  const storagePath = (body.storagePath ?? "").trim();
  const ano = Number(body.ano);
  const mes = Number(body.mes);
  if (!storagePath) {
    return NextResponse.json(
      { ok: false, error: "storagePath obrigatório." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(ano) || ano < 2000 || ano > 2100) {
    return NextResponse.json(
      { ok: false, error: "Ano inválido." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(mes) || mes < 1 || mes > 12) {
    return NextResponse.json(
      { ok: false, error: "Mês inválido." },
      { status: 400 },
    );
  }

  try {
    const buffer = await downloadCarImport(storagePath);
    const result = await buildCarPreview(buffer, ano, mes);
    const payload: CarPreviewPayload = {
      preview: result.classify.preview,
      encoding: result.encoding,
      totalLinhas: result.parsed.length,
      linhasDescartadas: result.linhasDescartadas,
      existente: result.existente,
      storagePath,
    };
    return NextResponse.json({ ok: true, data: payload });
  } catch (err) {
    if (err instanceof CarParseError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code, details: err.details },
        { status: 400 },
      );
    }
    console.error("[car/parse] erro:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Falha ao processar o arquivo.",
      },
      { status: 500 },
    );
  }
}
