import { ProcessosService } from "./processos.service";

let cached: ProcessosService | null = null;

export function getProcessosService(): ProcessosService {
  if (cached) return cached;

  const hasDb = !!process.env.DATABASE_URL;
  if (!hasDb) {
    throw new Error(
      "ProcessosService requer DATABASE_URL — configure .env.local (ver docs/supabase-setup.md).",
    );
  }

  const { DrizzleProcessoRepository, DrizzleAnaliseRepository } =
    require("@/lib/repositories/processos.drizzle") as typeof import("@/lib/repositories/processos.drizzle");
  cached = new ProcessosService(
    new DrizzleProcessoRepository(),
    new DrizzleAnaliseRepository(),
  );
  return cached;
}
