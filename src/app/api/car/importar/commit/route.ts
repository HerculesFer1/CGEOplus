/**
 * POST /api/car/importar/commit
 *
 * Recebe { storagePath, ano, mes, resolucoes, overwrite } (JSON).
 * Re-baixa o CSV do Supabase Storage, aplica resoluções manuais das fases
 * novas e persiste no banco em transação.
 *
 * O arquivo permanece no bucket para auditoria — cleanup opcional futuro.
 */

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  commitCarImport,
  CarOverwriteRequired,
  type CarCommitStats,
} from "@/lib/car/importer";
import { downloadCarImport } from "@/lib/car/storage";
import { CarParseError, type CarBucket } from "@/lib/car/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface CommitBody {
  storagePath?: string;
  filename?: string;
  ano?: number;
  mes?: number;
  overwrite?: boolean;
  resolucoes?: Record<string, CarBucket>;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as CommitBody | null;
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
  if (!Number.isFinite(ano) || !Number.isFinite(mes) || mes < 1 || mes > 12) {
    return NextResponse.json(
      { ok: false, error: "Ano/mês inválido." },
      { status: 400 },
    );
  }

  try {
    const buffer = await downloadCarImport(storagePath);
    const resolucoes = new Map<string, CarBucket>(
      Object.entries(body.resolucoes ?? {}),
    );
    const stats: CarCommitStats = await commitCarImport({
      buffer,
      ano,
      mes,
      arquivo: body.filename ?? storagePath.split("/").pop() ?? storagePath,
      resolucoes,
      overwrite: body.overwrite === true,
      importadoPor: null,
    });
    revalidatePath("/car");
    revalidatePath("/car/importar");
    return NextResponse.json({ ok: true, data: stats });
  } catch (err) {
    if (err instanceof CarOverwriteRequired) {
      return NextResponse.json(
        {
          ok: false,
          error: err.message,
          code: "OVERWRITE_REQUIRED",
          details: err.existente,
        },
        { status: 409 },
      );
    }
    if (err instanceof CarParseError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code, details: err.details },
        { status: 400 },
      );
    }
    console.error("[car/commit] erro:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro no commit.",
      },
      { status: 500 },
    );
  }
}
