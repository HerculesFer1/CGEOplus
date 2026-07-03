import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"] });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL não definida");
    process.exit(1);
  }

  console.log("→ Conectando ao Supabase...");
  const sql = postgres(url, {
    prepare: false,
    max: 1,
    connect_timeout: 10,
    idle_timeout: 2,
  });

  try {
    const [row] = await sql`
      SELECT current_database() as db,
             current_user as user,
             version() as version
    `;
    console.log("✓ Conexão OK");
    console.log("  Database:", row.db);
    console.log("  User:    ", row.user);
    console.log(
      "  Version: ",
      String(row.version).split(" ").slice(0, 2).join(" "),
    );
    await sql.end();
    process.exit(0);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("✗ Falha:", msg);
    await sql.end().catch(() => {});
    process.exit(1);
  }
}

main();
