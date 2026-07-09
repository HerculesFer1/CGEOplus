import { parsePlanilha } from "../src/lib/monitoramento/planilha-parser";
import * as fs from "node:fs";

for (const f of [
  "C:/Users/MARCO/Downloads/PSI MONITORAMENTO.xlsx",
  "C:/Users/MARCO/Downloads/_PILARES II - Monitoramento.xlsx",
]) {
  const buf = fs.readFileSync(f);
  const r = parsePlanilha(buf);
  console.log("\n===", f.split(/[/\\]/).pop());
  console.log("processadas:", r.abasProcessadas);
  console.log("ignoradas :", r.abasIgnoradas);
  console.log("linhas:", r.linhas.length, "erros:", r.erros.length);
  console.log("primeira :", JSON.stringify(r.linhas[0], null, 2)?.slice(0, 800));
  if (r.erros.length) console.log("erros amostra:", r.erros.slice(0, 3));
}
