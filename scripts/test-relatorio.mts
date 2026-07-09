import * as fs from "node:fs";
import * as path from "node:path";

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

const { gerarRelatorio } = await import("../src/lib/monitoramento/relatorio");

for (const sigla of ["PSI", "Pilares II"]) {
  const { buffer, filename } = await gerarRelatorio(sigla);
  const out = path.join(
    "C:/Users/MARCO/AppData/Local/Temp/claude/C--CGEO-/a2369de4-5601-407f-abdb-d5aaa86531b7/scratchpad",
    filename,
  );
  fs.writeFileSync(out, buffer);
  console.log(`✔ ${filename} → ${out} (${buffer.length} bytes)`);
}
process.exit(0);
