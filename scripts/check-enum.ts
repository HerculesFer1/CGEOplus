import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  try {
    const rows = await sql`SELECT unnest(enum_range(NULL::sistema)) as v`;
    console.log("Enum sistema values:", rows.map((r) => r.v));

    const test =
      await sql`SELECT COUNT(*)::int as n FROM processos WHERE sistema = ${"SINAFLOR"}`;
    console.log("SINAFLOR count in DB:", test[0].n);

    const sample =
      await sql`SELECT numero, sistema FROM processos WHERE sistema = 'SINAFLOR' LIMIT 3`;
    console.log("Sample rows:", sample);
  } catch (e) {
    console.error("Error:", (e as Error).message);
    if ((e as { cause?: Error }).cause) {
      console.error("Cause:", ((e as { cause?: Error }).cause as Error).message);
    }
  }
  await sql.end();
  process.exit(0);
}

main();
