"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  servidorCreateSchema,
  servidorUpdateSchema,
} from "@/lib/validators/servidor";
import { getServidoresService } from "@/lib/services/servidores.factory";
import {
  ServidorEmailInUseError,
  ServidorNotFoundError,
} from "@/lib/services/servidores.service";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fields?: Record<string, string[]> };

function toResult<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  return fn()
    .then((data) => ({ ok: true as const, data }))
    .catch((err) => {
      if (err instanceof z.ZodError) {
        return {
          ok: false as const,
          error: "Dados inválidos.",
          fields: err.flatten().fieldErrors as Record<string, string[]>,
        };
      }
      if (err instanceof ServidorEmailInUseError) {
        return { ok: false as const, error: err.message };
      }
      if (err instanceof ServidorNotFoundError) {
        return { ok: false as const, error: err.message };
      }
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Erro inesperado.",
      };
    });
}

export async function createServidorAction(input: unknown) {
  return toResult(async () => {
    const parsed = servidorCreateSchema.parse(input);
    const svc = getServidoresService();
    const created = await svc.create(parsed);
    revalidatePath("/servidores");
    return created;
  });
}

export async function updateServidorAction(input: unknown) {
  return toResult(async () => {
    const parsed = servidorUpdateSchema.parse(input);
    const svc = getServidoresService();
    const updated = await svc.update(parsed);
    revalidatePath("/servidores");
    return updated;
  });
}

export async function deleteServidorAction(id: string) {
  return toResult(async () => {
    const svc = getServidoresService();
    await svc.delete(id);
    revalidatePath("/servidores");
    return { id };
  });
}
