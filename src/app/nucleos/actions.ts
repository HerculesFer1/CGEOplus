"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { nucleos, servidorNucleo } from "@/lib/db/schema";
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

/**
 * Reconcilia servidores principais de um núcleo.
 *  - Servidores em `newMemberIds` que ainda não são principais aqui:
 *    encerra o vínculo principal anterior (data_fim = hoje) e cria novo.
 *  - Servidores atualmente principais aqui e que saíram da lista:
 *    encerra o vínculo (ficam sem núcleo principal — atribuir depois).
 */
async function reconcileMembers(nucleoId: string, newMemberIds: string[]) {
  const today = new Date().toISOString().slice(0, 10);
  const desired = new Set(newMemberIds);

  // Membros atualmente principais neste núcleo
  const current = await db
    .select({ servidorId: servidorNucleo.servidorId })
    .from(servidorNucleo)
    .where(
      and(
        eq(servidorNucleo.nucleoId, nucleoId),
        eq(servidorNucleo.isPrincipal, true),
        isNull(servidorNucleo.dataFim),
      ),
    );
  const currentIds = new Set(current.map((c) => c.servidorId));

  // Servidores adicionados
  const toAdd = [...desired].filter((id) => !currentIds.has(id));
  for (const servidorId of toAdd) {
    // Encerra vínculo principal atual (em outro núcleo, se houver)
    await db
      .update(servidorNucleo)
      .set({ dataFim: today })
      .where(
        and(
          eq(servidorNucleo.servidorId, servidorId),
          eq(servidorNucleo.isPrincipal, true),
          isNull(servidorNucleo.dataFim),
        ),
      );
    // Cria novo vínculo principal neste núcleo
    await db.insert(servidorNucleo).values({
      servidorId,
      nucleoId,
      isPrincipal: true,
      dataInicio: today,
      motivo: "atribuição via CRUD de núcleo",
    });
  }

  // Servidores removidos (não estão mais na lista)
  const toRemove = [...currentIds].filter((id) => !desired.has(id));
  for (const servidorId of toRemove) {
    await db
      .update(servidorNucleo)
      .set({ dataFim: today })
      .where(
        and(
          eq(servidorNucleo.nucleoId, nucleoId),
          eq(servidorNucleo.servidorId, servidorId),
          eq(servidorNucleo.isPrincipal, true),
          isNull(servidorNucleo.dataFim),
        ),
      );
  }
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

    if (parsed.membrosIds.length > 0) {
      await reconcileMembers(inserted.id, parsed.membrosIds);
    }

    revalidateAffected();
    return inserted;
  });
}

export async function updateNucleoAction(input: unknown) {
  return toResult(async () => {
    const parsed = nucleoUpdateSchema.parse(input);
    const { id, membrosIds, ...patch } = parsed;

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

    if (membrosIds !== undefined) {
      await reconcileMembers(id, membrosIds);
    }

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
