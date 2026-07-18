/**
 * Re-sync pontual do Monitoramento Externo contra a PRODUÇÃO, rodando o código
 * LOCAL corrigido (dedup-soma nas queimadas + RPC get_resumo_anual no mapbiomas).
 *
 * Idempotente (upserts). Uso: `npx tsx scripts/resync-monit.mts [mapbiomas|queimadas]`
 * Sem argumento, roda os dois.
 *
 * dotenv é carregado ANTES dos imports dinâmicos porque `@/lib/db/client` lê
 * DATABASE_URL no topo do módulo.
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

type Fonte = "mapbiomas" | "queimadas";

async function run(fonte: Fonte, fn: () => Promise<{ registrosInseridos: number; detalhes: Record<string, unknown>; fonteUrl: string }>) {
  const { registrarExecucao } = await import("@/lib/monit-ext/execucao");
  const t0 = Date.now();
  try {
    const r = await fn();
    const duracaoMs = Date.now() - t0;
    await registrarExecucao({
      fonte,
      status: "ok",
      registrosInseridos: r.registrosInseridos,
      duracaoMs,
      fonteUrl: r.fonteUrl,
      mensagem: `resync manual ${fonte} ok — ${r.registrosInseridos} registros`,
      detalhes: r.detalhes,
    });
    console.log(`✅ ${fonte}: ${r.registrosInseridos} registros em ${duracaoMs}ms`);
    console.log(`   fonte: ${r.fonteUrl}`);
    console.log(`   detalhes:`, r.detalhes);
  } catch (e) {
    const duracaoMs = Date.now() - t0;
    const msg = e instanceof Error ? e.message : String(e);
    await registrarExecucao({ fonte, status: "erro", registrosInseridos: 0, duracaoMs, mensagem: msg });
    console.error(`❌ ${fonte} falhou em ${duracaoMs}ms: ${msg}`);
    throw e;
  }
}

async function main() {
  const alvo = process.argv[2] as Fonte | undefined;

  if (!alvo || alvo === "mapbiomas") {
    const { syncMapbiomas } = await import("@/lib/monit-ext/mapbiomas-sync");
    await run("mapbiomas", syncMapbiomas);
  }
  if (!alvo || alvo === "queimadas") {
    const { syncQueimadas } = await import("@/lib/monit-ext/queimadas-sync");
    await run("queimadas", syncQueimadas);
  }

  console.log("\n[resync concluído]");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
