import { ServidoresService } from "./servidores.service";
import { InMemoryServidorRepository } from "@/lib/repositories/servidor.memory";

/**
 * Seleciona o repositório com base em DATABASE_URL:
 *  - sem env: InMemory (dev sem backend)
 *  - com env: Drizzle (Supabase real)
 *
 * Dependency Inversion: a UI e as Server Actions consomem sempre a interface
 * ServidorRepository — a implementação é decidida aqui.
 */

let cached: ServidoresService | null = null;

export function getServidoresService(): ServidoresService {
  if (cached) return cached;

  const hasDb = !!process.env.DATABASE_URL;

  if (hasDb) {
    // Import dinâmico evita carregar Drizzle/postgres em builds sem DB
    const { DrizzleServidorRepository } =
      require("@/lib/repositories/servidor.drizzle") as typeof import("@/lib/repositories/servidor.drizzle");
    cached = new ServidoresService(new DrizzleServidorRepository());
  } else {
    cached = new ServidoresService(new InMemoryServidorRepository());
  }

  return cached;
}
