/**
 * Reimporta apenas as linhas SINAFLOR que falharam no import inicial
 * (as 23 linhas de FEVEREIRO afetadas por race condition da adição do enum).
 */

import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { readFileSync } from "node:fs";
import { parsePlanilha } from "@/lib/import/planilha-parser";
import { buildAnalistaMap, executarImport } from "@/lib/import/importer";

const PLANILHA = "C:/CGEO+/data/PROCESSOS_CONTABILIZAR_[2026].xlsx";

async function main() {
  console.log(`→ Lendo ${PLANILHA}`);
  const buf = readFileSync(PLANILHA);
  const parsed = parsePlanilha(buf);

  const sinaflorRows = parsed.linhas.filter((l) => l.sistema === "SINAFLOR");
  console.log(`  Total SINAFLOR na planilha: ${sinaflorRows.length}`);

  const analistaMap = await buildAnalistaMap();

  console.log("\n→ Reexecutando import das linhas SINAFLOR...");
  const stats = await executarImport(sinaflorRows, analistaMap);

  console.log(`\n📊 Reimport SINAFLOR:`);
  console.log(`   Total:            ${stats.totalLinhas}`);
  console.log(`   Análises OK:      ${stats.analisesInseridas}`);
  console.log(`   Ignoradas:        ${stats.ignorados}`);
  console.log(`   Erros:            ${stats.erros.length}`);

  if (stats.erros.length > 0) {
    console.log("\n   Amostra de erros:");
    stats.erros.slice(0, 5).forEach((e) => {
      console.log(`    - ${e.linha.aba}:${e.linha.linhaNumero} →`);
      console.log(`      ${e.problema.slice(0, 400)}`);
    });
  }

  process.exit(stats.erros.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("✗ Erro:", err);
  process.exit(1);
});
