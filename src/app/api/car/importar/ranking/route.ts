/**
 * POST /api/car/importar/ranking
 *
 * Endpoint único para ranking nacional por UF — arquivo pequeno (~5-20 KB),
 * então recebemos o conteúdo em JSON como base64, evitando o bug de
 * multipart do Next 16 + Turbopack.
 *
 * Body: JSON {
 *   filename: string,
 *   contentBase64: string,
 *   ano: number,
 *   mes: number,
 *   mode: "preview" | "commit",
 *   overwrite?: boolean,
 * }
 */

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  buildUfRankingPreview,
  commitUfRanking,
  UfRankingOverwriteRequired,
  type UfRankingCommitStats,
  type UfRankingPreview,
} from "@/lib/car/uf-ranking-importer";
import { CarParseError } from "@/lib/car/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  filename?: string;
  contentBase64?: string;
  ano?: number;
  mes?: number;
  mode?: "preview" | "commit";
  overwrite?: boolean;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — mais que suficiente pro arquivo real

export type UfRankingRoutePayload =
  | { ok: true; mode: "preview"; data: UfRankingPreview }
  | { ok: true; mode: "commit"; data: UfRankingCommitStats };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "JSON inválido." },
      { status: 400 },
    );
  }
  const ano = Number(body.ano);
  const mes = Number(body.mes);
  const mode = body.mode ?? "preview";
  const contentB64 = (body.contentBase64 ?? "").trim();

  if (!contentB64) {
    return NextResponse.json(
      { ok: false, error: "Conteúdo do arquivo ausente." },
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

  let buffer: Buffer;
  try {
    buffer = Buffer.from(contentB64, "base64");
  } catch {
    return NextResponse.json(
      { ok: false, error: "Base64 inválido." },
      { status: 400 },
    );
  }
  if (buffer.byteLength === 0) {
    return NextResponse.json(
      { ok: false, error: "Arquivo vazio após decodificar base64." },
      { status: 400 },
    );
  }
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: `Arquivo excede ${MAX_BYTES / 1024 / 1024} MB.`,
      },
      { status: 400 },
    );
  }

  try {
    if (mode === "preview") {
      const data = await buildUfRankingPreview(buffer, ano, mes);
      return NextResponse.json({ ok: true, mode, data });
    }

    const data = await commitUfRanking({
      buffer,
      ano,
      mes,
      overwrite: body.overwrite === true,
    });
    revalidatePath("/car");
    revalidatePath("/car/importar/ranking");
    return NextResponse.json({ ok: true, mode, data });
  } catch (err) {
    if (err instanceof UfRankingOverwriteRequired) {
      return NextResponse.json(
        {
          ok: false,
          error: err.message,
          code: "OVERWRITE_REQUIRED",
          details: err.jaExiste,
        },
        { status: 409 },
      );
    }
    if (err instanceof CarParseError) {
      return NextResponse.json(
        {
          ok: false,
          error: err.message,
          code: err.code,
          details: err.details,
        },
        { status: 400 },
      );
    }
    console.error("[car/importar/ranking] erro:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro no processamento.",
      },
      { status: 500 },
    );
  }
}
