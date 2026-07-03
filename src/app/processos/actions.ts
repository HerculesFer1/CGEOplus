"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  analiseFromPlanilhaSchema,
  processoCreateSchema,
} from "@/lib/validators/processo";
import { getProcessosService } from "@/lib/services/processos.factory";
import { ProcessoNotFoundError } from "@/lib/services/processos.service";

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
      if (err instanceof ProcessoNotFoundError) {
        return { ok: false as const, error: err.message };
      }
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Erro inesperado.",
      };
    });
}

export async function createProcessoAction(input: unknown) {
  return toResult(async () => {
    const parsed = processoCreateSchema.parse(input);
    const svc = getProcessosService();
    const created = await svc.createProcesso(parsed);
    revalidatePath("/processos");
    return created;
  });
}

export async function registrarAnaliseAction(input: unknown) {
  return toResult(async () => {
    const parsed = analiseFromPlanilhaSchema.parse(input);
    const svc = getProcessosService();
    const result = await svc.registrarAnalisePlanilha(parsed);
    revalidatePath("/processos");
    revalidatePath(`/processos/${result.processo.id}`);
    return result;
  });
}

export async function deleteProcessoAction(id: string) {
  return toResult(async () => {
    const svc = getProcessosService();
    await svc.delete(id);
    revalidatePath("/processos");
    return { id };
  });
}
