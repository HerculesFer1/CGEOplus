import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Cliente Drizzle único (singleton). DATABASE_URL usa o "transaction pooler"
 * do Supabase (porta 6543). Em dev, guardamos em globalThis para sobreviver
 * ao HMR do Turbopack — sem isso, cada hot reload cria um pool novo, o antigo
 * vira zumbi segurando slots no Supavisor até idle_timeout expirar, e as
 * queries subsequentes travam esperando conexão.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL não configurada. Copie .env.example para .env.local.",
  );
}

type QueryClient = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as {
  __cgeoPgClient?: QueryClient;
};

const queryClient: QueryClient =
  globalForDb.__cgeoPgClient ??
  postgres(connectionString, {
    prepare: false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__cgeoPgClient = queryClient;
}

export const db = drizzle(queryClient, { schema });
export type DB = typeof db;
