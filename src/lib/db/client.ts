import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Cliente Drizzle único (singleton).
 * DATABASE_URL vem do Supabase — string de conexão "session pooler" ou "direct".
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL não configurada. Copie .env.example para .env.local.",
  );
}

const queryClient = postgres(connectionString, {
  prepare: false, // requerido pelo pooler do Supabase
  max: 10,
});

export const db = drizzle(queryClient, { schema });
export type DB = typeof db;
