"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { metas } from "@/lib/db/schema";
import {
  metaCreateSchema,
  metaUpdateSchema,
  type MetaEscopo,
  type MetaMetrica,
  type MetaSistema,
} from "@/lib/validators/meta";
import { metasService } from "@/lib/services/metas.service";

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
      // Unique index violado = meta já existe
      const msg = err instanceof Error ? err.message : "Erro inesperado.";
      if (/ux_metas_dedup/i.test(msg)) {
        return {
          ok: false as const,
          error:
            "Já existe uma meta com este escopo/alvo/métrica para este período.",
        };
      }
      return { ok: false as const, error: msg };
    });
}

function revalidateAffected() {
  revalidatePath("/metas");
  revalidatePath("/dashboard");
}

export async function createMetaAction(input: unknown) {
  return toResult(async () => {
    const parsed = metaCreateSchema.parse(input);
    const [inserted] = await db
      .insert(metas)
      .values({
        periodo: parsed.periodo,
        escopo: parsed.escopo,
        alvoId: parsed.alvoId || null,
        alvoSistema: (parsed.alvoSistema || null) as MetaSistema | null,
        metrica: parsed.metrica,
        valorAlvo: parsed.valorAlvo.toString(),
        ano: parsed.ano,
        mes: parsed.mes ?? null,
        semanaIso: parsed.semanaIso ?? null,
        observacao: parsed.observacao || null,
      })
      .returning();
    revalidateAffected();
    return inserted;
  });
}

export async function updateMetaAction(input: unknown) {
  return toResult(async () => {
    const parsed = metaUpdateSchema.parse(input);
    const { id, ...patch } = parsed;

    const [updated] = await db
      .update(metas)
      .set({
        ...(patch.valorAlvo !== undefined && {
          valorAlvo: patch.valorAlvo.toString(),
        }),
        ...(patch.observacao !== undefined && {
          observacao: patch.observacao || null,
        }),
      })
      .where(eq(metas.id, id))
      .returning();

    if (!updated) throw new Error("Meta não encontrada.");
    revalidateAffected();
    return updated;
  });
}

export async function deleteMetaAction(id: string) {
  return toResult(async () => {
    const [deleted] = await db
      .delete(metas)
      .where(eq(metas.id, id))
      .returning({ id: metas.id });
    if (!deleted) throw new Error("Meta não encontrada.");
    revalidateAffected();
    return deleted;
  });
}

/**
 * Sugere valor inicial para o formulário — usada via server action para
 * não expor a query ao client.
 */
export async function sugerirValorMetaAction(base: {
  escopo: MetaEscopo;
  alvoId?: string;
  alvoSistema?: MetaSistema;
  metrica: MetaMetrica;
}) {
  return toResult(() => metasService.sugerirValor(base));
}
