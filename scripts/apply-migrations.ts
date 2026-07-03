import { config } from "dotenv";
import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

config({ path: [".env.local", ".env"] });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL não definida");
    process.exit(1);
  }

  const migrationsDir = "./drizzle/migrations";
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`→ Encontradas ${files.length} migration(s):`);
  files.forEach((f) => console.log(`   • ${f}`));

  const sql = postgres(url, { prepare: false, max: 1 });

  for (const file of files) {
    const path = join(migrationsDir, file);
    const content = readFileSync(path, "utf-8");

    // drizzle-kit separa statements com '--> statement-breakpoint'
    const statements = content
      .split(/--> statement-breakpoint/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`\n→ Aplicando ${file} (${statements.length} statements)...`);
    for (const [i, stmt] of statements.entries()) {
      try {
        await sql.unsafe(stmt);
        process.stdout.write(`  ✓ ${i + 1}/${statements.length}\r`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Ignora "already exists" para permitir re-execução idempotente
        if (msg.includes("already exists")) {
          process.stdout.write(`  ⊙ ${i + 1}/${statements.length} (já existe)\r`);
        } else {
          console.error(`\n✗ Erro no statement ${i + 1}:\n${stmt.slice(0, 200)}\n${msg}`);
          await sql.end();
          process.exit(1);
        }
      }
    }
    console.log(`\n  ✓ ${file} aplicado.`);
  }

  console.log("\n→ Verificando tabelas criadas...");
  const tables = await sql<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;
  console.log("  Tabelas no schema public:");
  tables.forEach((t) => console.log(`   • ${t.tablename}`));

  await sql.end();
  console.log("\n✓ Migrations aplicadas com sucesso.");
  process.exit(0);
}

main();
