import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"] });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });

  const nucleos = await sql`SELECT nome FROM nucleos ORDER BY nome`;
  const servidores = await sql`SELECT nome, apelido, tipo_vinculo FROM servidores ORDER BY nome`;
  const vinculos = await sql`
    SELECT s.apelido, n.nome as nucleo, sn.is_principal
    FROM servidor_nucleo sn
    JOIN servidores s ON s.id = sn.servidor_id
    JOIN nucleos n ON n.id = sn.nucleo_id
    ORDER BY s.apelido
  `;
  const atividades = await sql`SELECT nome, complexidade FROM atividades ORDER BY complexidade, nome`;

  console.log(`\n📊 Núcleos (${nucleos.length}):`);
  nucleos.forEach((n) => console.log(`   • ${n.nome}`));

  console.log(`\n👥 Servidores (${servidores.length}):`);
  servidores.forEach((s) => console.log(`   • ${s.apelido.padEnd(10)} ${s.nome} — ${s.tipo_vinculo}`));

  console.log(`\n🔗 Vínculos servidor↔núcleo (${vinculos.length}):`);
  vinculos.forEach((v) => console.log(`   • ${v.apelido.padEnd(10)} → ${v.nucleo} ${v.is_principal ? "(principal)" : ""}`));

  console.log(`\n📋 Atividades (${atividades.length}):`);
  atividades.forEach((a) => console.log(`   • [${a.complexidade}] ${a.nome}`));

  await sql.end();
  process.exit(0);
}

main();
