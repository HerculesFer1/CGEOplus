import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });

  const [p] = await sql<{ n: number }[]>`SELECT COUNT(*)::int as n FROM processos`;
  const [a] = await sql<{ n: number }[]>`SELECT COUNT(*)::int as n FROM analises`;
  const [s] = await sql<{ n: number }[]>`SELECT COUNT(*)::int as n FROM servidores`;
  const dist = await sql<{ sistema: string; n: number }[]>`
    SELECT sistema, COUNT(*)::int as n FROM processos GROUP BY sistema ORDER BY sistema
  `;
  const top = await sql<{ apelido: string; n: number }[]>`
    SELECT s.apelido, COUNT(*)::int as n
    FROM analises a
    JOIN servidores s ON s.id = a.servidor_id
    GROUP BY s.apelido
    ORDER BY n DESC
    LIMIT 6
  `;
  const meses = await sql<{ mes: string; n: number }[]>`
    SELECT to_char(data_analise, 'YYYY-MM') as mes, COUNT(*)::int as n
    FROM analises
    GROUP BY mes
    ORDER BY mes
  `;

  console.log(`\n📊 CGEO+ · Estado do banco\n`);
  console.log(`  Servidores:  ${s.n}`);
  console.log(`  Processos:   ${p.n}`);
  console.log(`  Análises:    ${a.n}`);
  console.log(`\n  Distribuição por sistema:`);
  dist.forEach((r) => console.log(`    ${r.sistema.padEnd(10)} ${r.n}`));
  console.log(`\n  Top analistas:`);
  top.forEach((r) => console.log(`    ${r.apelido.padEnd(12)} ${r.n}`));
  console.log(`\n  Análises por mês:`);
  meses.forEach((r) => console.log(`    ${r.mes}  ${r.n}`));

  await sql.end();
  process.exit(0);
}

main();
