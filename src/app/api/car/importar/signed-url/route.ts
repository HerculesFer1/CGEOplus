/**
 * POST /api/car/importar/signed-url
 *
 * Emite URL assinada para o cliente fazer upload direto do CSV pro bucket
 * `car-imports`. Contorna o limite de body multipart do Next.js.
 *
 * Body: JSON { filename, ano, mes }
 * Retorna: JSON { ok, data: { path, token, signedUrl } }
 */

import { NextResponse } from "next/server";

import { createSignedUploadUrl } from "@/lib/car/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { filename?: string; ano?: number; mes?: number }
    | null;
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "JSON inválido." },
      { status: 400 },
    );
  }
  const filename = (body.filename ?? "").trim();
  const ano = Number(body.ano);
  const mes = Number(body.mes);
  if (!filename) {
    return NextResponse.json(
      { ok: false, error: "filename obrigatório." },
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
    const signed = await createSignedUploadUrl(ano, mes, filename);
    return NextResponse.json({ ok: true, data: signed });
  } catch (err) {
    console.error("[car/signed-url] erro:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Falha ao emitir URL de upload.",
      },
      { status: 500 },
    );
  }
}
