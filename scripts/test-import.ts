/**
 * Teste E2E do import da planilha real contra Supabase.
 * Faz dry-run (sem commit) por padrão para não poluir o banco.
 * Passe --commit para inserir no banco.
 */

import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { readFileSync } from "node:fs";
import { parsePlanilha } from "@/lib/import/planilha-parser";
import { buildAnalistaMap, executarImport } from "@/lib/import/importer";

const COMMIT = process.argv.includes("--commit");
const PLANILHA = "C:/CGEO+/data/PROCESSOS_CONTABILIZAR_[2026].xlsx";

async function main() {
  console.log(`→ Lendo ${PLANILHA}`);
  const buf = readFileSync(PLANILHA);

  console.log("→ Parseando...");
  const parsed = parsePlanilha(buf);
  console.log(`  Abas processadas: ${parsed.abasProcessadas.join(", ")}`);
  console.log(`  Abas ignoradas:   ${parsed.abasIgnoradas.join(", ")}`);
  console.log(`  Linhas válidas:   ${parsed.linhas.length}`);
  console.log(`  Erros:            ${parsed.erros.length}`);

  if (parsed.erros.length > 0) {
    console.log("\n  Amostra de erros:");
    parsed.erros.slice(0, 5).forEach((e) => {
      console.log(`   - ${e.aba}:${e.linhaNumero} → ${e.problema}`);
    });
  }

  console.log("\n→ Carregando mapa de analistas do banco...");
  const analistaMap = await buildAnalistaMap();
  console.log(`  ${analistaMap.size} chaves de lookup`);

  const naoMatch = new Set<string>();
  for (const l of parsed.linhas) {
    if (!analistaMap.has(l.analistaApelido.trim().toLowerCase())) {
      naoMatch.add(l.analistaApelido);
    }
  }
  console.log(`\n  Analistas não cadastrados: ${naoMatch.size}`);
  if (naoMatch.size > 0) {
    Array.from(naoMatch).sort().slice(0, 20).forEach((n) => console.log(`   - ${n}`));
  }

  const processosUnicos = new Set(
    parsed.linhas.map((l) => `${l.numeroProcesso}::${l.sistema}`),
  ).size;
  console.log(`  Processos únicos a criar: ${processosUnicos}`);

  if (!COMMIT) {
    console.log("\n✓ Dry-run OK. Rode com --commit para inserir.");
    process.exit(0);
  }

  console.log("\n→ Executando IMPORT (commit)...");
  const start = Date.now();
  const stats = await executarImport(parsed.linhas, analistaMap, (feitas, total) => {
    if (feitas % 100 === 0) process.stdout.write(`  ${feitas}/${total}\r`);
  });
  const dur = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`\n\n📊 Import concluído em ${dur}s:`);
  console.log(`   Total linhas:      ${stats.totalLinhas}`);
  console.log(`   Processos criados: ${stats.processosCriados}`);
  console.log(`   Análises inseridas: ${stats.analisesInseridas}`);
  console.log(`   Ignorados:         ${stats.ignorados}`);
  console.log(`   Erros:             ${stats.erros.length}`);

  if (stats.erros.length > 0) {
    console.log("\n   Amostra de erros no commit:");
    stats.erros.slice(0, 5).forEach((e) => {
      console.log(`    - ${e.linha.aba}:${e.linha.linhaNumero} → ${e.problema}`);
    });
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Erro:", err);
  process.exit(1);
});
