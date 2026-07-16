/**
 * Handler compartilhado para os 3 endpoints de cron.
 *
 * Responsabilidades:
 *   1. Gate por CRON_SECRET (rejeita se não autorizado)
 *   2. Invoca o sync passado
 *   3. Sempre grava em `monit_ext_execucao` — sucesso ou erro
 *   4. Retorna JSON padronizado
 *
 * Vercel Cron envia `Authorization: Bearer <CRON_SECRET>` automaticamente
 * quando a env var está configurada. GET manual (dev/staging) pode passar o
 * mesmo header — o handler não distingue.
 */

import { NextResponse } from "next/server";

import { registrarExecucao } from "./execucao";

type Fonte = "mapbiomas" | "prodes" | "queimadas";

interface SyncFnResult {
  registrosInseridos: number;
  detalhes: Record<string, unknown>;
  fonteUrl: string;
}

export async function runCronSync(
  request: Request,
  fonte: Fonte,
  syncFn: () => Promise<SyncFnResult>,
): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const t0 = Date.now();
  try {
    const result = await syncFn();
    const duracaoMs = Date.now() - t0;
    await registrarExecucao({
      fonte,
      status: "ok",
      registrosInseridos: result.registrosInseridos,
      duracaoMs,
      fonteUrl: result.fonteUrl,
      mensagem: `sync ${fonte} ok — ${result.registrosInseridos} registros`,
      detalhes: result.detalhes,
    });
    return NextResponse.json({
      ok: true,
      fonte,
      duracaoMs,
      ...result,
    });
  } catch (err) {
    const duracaoMs = Date.now() - t0;
    const mensagem = err instanceof Error ? err.message : String(err);
    await registrarExecucao({
      fonte,
      status: "erro",
      registrosInseridos: 0,
      duracaoMs,
      mensagem,
      detalhes: { stack: err instanceof Error ? err.stack : null },
    });
    return NextResponse.json(
      { ok: false, fonte, duracaoMs, error: mensagem },
      { status: 500 },
    );
  }
}
