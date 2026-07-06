"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { atividades } from "@/lib/db/schema";
import {
  atividadeCreateSchema,
  atividadeUpdateSchema,
} from "@/lib/validators/atividade";

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
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Erro inesperado.",
      };
    });
}

function revalidateAffected() {
  revalidatePath("/atividades");
  revalidatePath("/dashboard");
}

export async function createAtividadeAction(input: unknown) {
  return toResult(async () => {
    const parsed = atividadeCreateSchema.parse(input);
    const [inserted] = await db
      .insert(atividades)
      .values({
        nome: parsed.nome,
        complexidade: parsed.complexidade,
        nucleoId: parsed.nucleoId || null,
        descricao: parsed.descricao || null,
        ativo: parsed.ativo,
      })
      .returning();
    revalidateAffected();
    return inserted;
  });
}

export async function updateAtividadeAction(input: unknown) {
  return toResult(async () => {
    const parsed = atividadeUpdateSchema.parse(input);
    const { id, ...patch } = parsed;

    const [updated] = await db
      .update(atividades)
      .set({
        ...(patch.nome !== undefined && { nome: patch.nome }),
        ...(patch.complexidade !== undefined && {
          complexidade: patch.complexidade,
        }),
        ...(patch.nucleoId !== undefined && {
          nucleoId: patch.nucleoId || null,
        }),
        ...(patch.descricao !== undefined && {
          descricao: patch.descricao || null,
        }),
        ...(patch.ativo !== undefined && { ativo: patch.ativo }),
      })
      .where(eq(atividades.id, id))
      .returning();

    if (!updated) throw new Error("Atividade não encontrada.");
    revalidateAffected();
    return updated;
  });
}

export async function toggleAtividadeAtivoAction(id: string) {
  return toResult(async () => {
    const [current] = await db
      .select({ ativo: atividades.ativo })
      .from(atividades)
      .where(eq(atividades.id, id))
      .limit(1);
    if (!current) throw new Error("Atividade não encontrada.");

    const [updated] = await db
      .update(atividades)
      .set({ ativo: !current.ativo })
      .where(eq(atividades.id, id))
      .returning();
    revalidateAffected();
    return updated;
  });
}
