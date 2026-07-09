import * as fs from "node:fs";
import * as path from "node:path";

// Carrega .env.local antes de qualquer import que dependa de process.env
const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  const raw = fs.readFileSync(envFile, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

const { parsePlanilha } = await import("../src/lib/monitoramento/planilha-parser");
const { commitImport } = await import("../src/lib/monitoramento/importer");

async function importar(file: string, sigla: string) {
  const buf = fs.readFileSync(file);
  const parsed = parsePlanilha(buf);
  console.log(`\n▶ ${file.split(/[\\/]/).pop()} → ${sigla}`);
  console.log(`  linhas: ${parsed.linhas.length}  erros: ${parsed.erros.length}`);
  const stats = await commitImport(
    parsed.linhas,
    sigla,
    file.split(/[\\/]/).pop() ?? "arquivo.xlsx",
    buf,
  );
  console.log(`  → inseridos:        ${stats.titulosInseridos}`);
  console.log(`  → duplicados:       ${stats.duplicados}`);
  console.log(`  → sem intervalo:    ${stats.semIntervalo}`);
  console.log(`  → comunidades novas: ${stats.comunidadesCriadas}`);
}

await importar("C:/Users/MARCO/Downloads/PSI MONITORAMENTO.xlsx", "PSI");
await importar("C:/Users/MARCO/Downloads/_PILARES II - Monitoramento.xlsx", "PILARES_II");
process.exit(0);
