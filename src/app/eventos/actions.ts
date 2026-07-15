"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { eventos } from "@/lib/db/schema";
import {
  eventoCreateSchema,
  eventoUpdateSchema,
} from "@/lib/validators/evento";

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
  revalidatePath("/eventos");
  revalidatePath("/dashboard");
}

export async function createEventoAction(input: unknown) {
  return toResult(async () => {
    const parsed = eventoCreateSchema.parse(input);
    const [inserted] = await db
      .insert(eventos)
      .values({
        titulo: parsed.titulo,
        descricao: parsed.descricao || null,
        local: parsed.local || null,
        tipo: parsed.tipo,
        inicio: new Date(parsed.inicio),
        fim: new Date(parsed.fim),
        diaInteiro: parsed.diaInteiro,
        nucleoId: parsed.nucleoId || null,
        lembretesMin: parsed.lembretesMin,
      })
      .returning();
    revalidateAffected();
    return inserted;
  });
}

export async function updateEventoAction(input: unknown) {
  return toResult(async () => {
    const parsed = eventoUpdateSchema.parse(input);
    const { id, ...patch } = parsed;

    const [updated] = await db
      .update(eventos)
      .set({
        titulo: patch.titulo,
        descricao: patch.descricao || null,
        local: patch.local || null,
        tipo: patch.tipo,
        inicio: new Date(patch.inicio),
        fim: new Date(patch.fim),
        diaInteiro: patch.diaInteiro,
        nucleoId: patch.nucleoId || null,
        lembretesMin: patch.lembretesMin,
      })
      .where(eq(eventos.id, id))
      .returning();

    if (!updated) throw new Error("Evento não encontrado.");
    revalidateAffected();
    return updated;
  });
}

export async function deleteEventoAction(id: string) {
  return toResult(async () => {
    const [deleted] = await db
      .delete(eventos)
      .where(eq(eventos.id, id))
      .returning({ id: eventos.id });
    if (!deleted) throw new Error("Evento não encontrado.");
    revalidateAffected();
    return deleted;
  });
}
