import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import postgres from "postgres";

/**
 * ALTER TYPE ... ADD VALUE não pode rodar em transação.
 * Precisamos passar como raw SQL sem envolver em begin/commit.
 */
async function main() {
  const url = process.env.DATABASE_URL!;
  // Nova conexão dedicada
  const sql = postgres(url, {
    prepare: false,
    max: 1,
    fetch_types: false, // não faz cache do enum
  });

  try {
    console.log("→ Estado atual do enum:");
    const before =
      await sql`SELECT unnest(enum_range(NULL::sistema)) as v`;
    console.log("  ", before.map((r) => r.v).join(", "));

    if (before.some((r) => r.v === "SINAFLOR")) {
      console.log("\n✓ SINAFLOR já presente.");
      await sql.end();
      process.exit(0);
    }

    console.log("\n→ Adicionando SINAFLOR...");
    await sql.unsafe("ALTER TYPE sistema ADD VALUE 'SINAFLOR'");

    console.log("→ Verificando...");
    const after = await sql`SELECT unnest(enum_range(NULL::sistema)) as v`;
    console.log("  ", after.map((r) => r.v).join(", "));

    console.log("\n✓ Enum atualizado com sucesso.");
  } catch (err) {
    console.error("✗ Erro:", (err as Error).message);
    process.exit(1);
  }

  await sql.end();
  process.exit(0);
}

main();
