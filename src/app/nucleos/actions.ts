"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { nucleos } from "@/lib/db/schema";
import {
  nucleoCreateSchema,
  nucleoUpdateSchema,
} from "@/lib/validators/nucleo";

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
  revalidatePath("/nucleos");
  revalidatePath("/servidores");
  revalidatePath("/atividades");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/produtividade");
  revalidatePath("/dashboard/sobrecarga");
}

export async function createNucleoAction(input: unknown) {
  return toResult(async () => {
    const parsed = nucleoCreateSchema.parse(input);
    const existing = await db
      .select({ id: nucleos.id })
      .from(nucleos)
      .where(eq(nucleos.nome, parsed.nome))
      .limit(1);
    if (existing.length > 0) throw new Error("Já existe um núcleo com esse nome.");

    const [inserted] = await db
      .insert(nucleos)
      .values({
        nome: parsed.nome,
        descricao: parsed.descricao || null,
        corTema: parsed.corTema || null,
        minMembros: parsed.minMembros,
        ativo: parsed.ativo,
      })
      .returning();

    revalidateAffected();
    return inserted;
  });
}

export async function updateNucleoAction(input: unknown) {
  return toResult(async () => {
    const parsed = nucleoUpdateSchema.parse(input);
    const { id, ...patch } = parsed;

    if (patch.nome) {
      const dup = await db
        .select({ id: nucleos.id })
        .from(nucleos)
        .where(and(eq(nucleos.nome, patch.nome), ne(nucleos.id, id)))
        .limit(1);
      if (dup.length > 0) throw new Error("Já existe outro núcleo com esse nome.");
    }

    const [updated] = await db
      .update(nucleos)
      .set({
        ...(patch.nome !== undefined && { nome: patch.nome }),
        ...(patch.descricao !== undefined && {
          descricao: patch.descricao || null,
        }),
        ...(patch.corTema !== undefined && { corTema: patch.corTema || null }),
        ...(patch.minMembros !== undefined && { minMembros: patch.minMembros }),
        ...(patch.ativo !== undefined && { ativo: patch.ativo }),
      })
      .where(eq(nucleos.id, id))
      .returning();

    if (!updated) throw new Error("Núcleo não encontrado.");
    revalidateAffected();
    return updated;
  });
}

export async function toggleNucleoAtivoAction(id: string) {
  return toResult(async () => {
    const [current] = await db
      .select({ ativo: nucleos.ativo })
      .from(nucleos)
      .where(eq(nucleos.id, id))
      .limit(1);
    if (!current) throw new Error("Núcleo não encontrado.");

    const [updated] = await db
      .update(nucleos)
      .set({ ativo: !current.ativo })
      .where(eq(nucleos.id, id))
      .returning();
    revalidateAffected();
    return updated;
  });
}
