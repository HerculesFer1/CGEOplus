/**
 * Auditoria de sincronizações — grava uma linha em `monit_ext_execucao` por
 * corrida do cron. Alimenta a Timeline de Bases e o card "última / próxima
 * atualização" do aparato geral. Nunca lança erro — falha silenciosa é
 * preferível a impedir o resto do fluxo.
 */

import { db } from "@/lib/db/client";
import { monitExtExecucao } from "@/lib/db/monitoramento-externo";

type Fonte = "mapbiomas" | "prodes" | "queimadas";
type Status = "ok" | "parcial" | "erro";

interface RegistrarInput {
  fonte: Fonte;
  status: Status;
  registrosInseridos: number;
  duracaoMs: number;
  fonteUrl?: string;
  mensagem?: string;
  detalhes?: Record<string, unknown>;
}

export async function registrarExecucao(input: RegistrarInput): Promise<void> {
  try {
    await db.insert(monitExtExecucao).values({
      fonte: input.fonte,
      status: input.status,
      registrosInseridos: input.registrosInseridos,
      duracaoMs: input.duracaoMs,
      fonteUrl: input.fonteUrl,
      mensagem: input.mensagem,
      detalhes: input.detalhes,
    });
  } catch (err) {
    // Auditoria não pode quebrar o sync. Loga só.
    console.error("[monit-ext] falha ao gravar execucao:", err);
  }
}
