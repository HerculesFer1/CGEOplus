"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { profiles, servidores, servidorNucleo } from "@/lib/db/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  aprovarPerfilInputSchema,
  vincularServidorInputSchema,
  type AprovarPerfilInput,
  type VincularServidorInput,
} from "./schemas";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin(): Promise<
  | { ok: true; adminId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const [profile] = await db
    .select({ role: profiles.role, approved: profiles.approved })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile?.approved || profile.role !== "admin") {
    return { ok: false, error: "Ação restrita ao administrador." };
  }
  return { ok: true, adminId: user.id };
}

function toActionError(err: unknown): { ok: false; error: string } {
  if (err instanceof z.ZodError) {
    const first = err.issues[0];
    return { ok: false, error: first?.message ?? "Dados inválidos." };
  }
  return {
    ok: false,
    error: err instanceof Error ? err.message : "Erro inesperado.",
  };
}

/**
 * Aprovação = três coisas em uma transação:
 *   1. INSERT em servidores (materializa a pessoa no catálogo operacional)
 *   2. INSERT opcional em servidor_nucleo (se admin escolheu núcleo)
 *   3. UPDATE profile: approved=true, role, servidor_id vinculado
 *
 * Bypassa a service `ServidoresService` porque aqui `nucleoPrincipal` é
 * opcional e o email já é canonizado pelo próprio profile.
 */
export async function aprovarPerfilAction(
  input: AprovarPerfilInput,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  let parsed: AprovarPerfilInput;
  try {
    parsed = aprovarPerfilInputSchema.parse(input);
  } catch (err) {
    return toActionError(err);
  }

  const [perfil] = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      nome: profiles.nome,
      matricula: profiles.matricula,
      approved: profiles.approved,
      servidorId: profiles.servidorId,
    })
    .from(profiles)
    .where(eq(profiles.id, parsed.perfilId))
    .limit(1);

  if (!perfil) return { ok: false, error: "Perfil não encontrado." };
  if (perfil.approved) {
    return { ok: false, error: "Este perfil já está aprovado." };
  }
  if (perfil.servidorId) {
    return { ok: false, error: "Perfil já vinculado a um servidor." };
  }

  const emailNormalizado = perfil.email.trim().toLowerCase();
  const dup = await encontrarColisaoServidor({
    email: emailNormalizado,
    matricula: perfil.matricula,
  });
  if (dup) return { ok: false, error: dup };

  try {
    await db.transaction(async (tx) => {
      const [novoServidor] = await tx
        .insert(servidores)
        .values({
          nome: perfil.nome,
          apelido: parsed.apelido,
          matricula: perfil.matricula || null,
          email: emailNormalizado,
          cargo: parsed.cargo,
          tipoVinculo: parsed.tipoVinculo,
          dataIngresso: parsed.dataIngresso,
          status: "ativo",
        })
        .returning({ id: servidores.id });

      if (parsed.nucleoId) {
        await tx.insert(servidorNucleo).values({
          servidorId: novoServidor.id,
          nucleoId: parsed.nucleoId,
          isPrincipal: true,
          dataInicio: parsed.dataIngresso,
        });
      }

      await tx
        .update(profiles)
        .set({
          approved: true,
          role: parsed.role,
          approvedAt: new Date(),
          approvedBy: guard.adminId,
          servidorId: novoServidor.id,
        })
        .where(eq(profiles.id, parsed.perfilId));
    });
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/admin/aprovacoes");
  revalidatePath("/servidores");
  return { ok: true };
}

/**
 * Verifica se já existe um servidor com o mesmo email ou matrícula.
 * Retorna string de erro amigável ou null se está livre.
 *
 * A defesa final continua sendo os índices únicos servidores_email_unique
 * e servidores_matricula_unique — este check só troca o "duplicate key
 * value violates unique constraint" cru por uma mensagem específica.
 */
async function encontrarColisaoServidor(input: {
  email: string;
  matricula: string | null;
}): Promise<string | null> {
  const [porEmail] = await db
    .select({ id: servidores.id })
    .from(servidores)
    .where(eq(servidores.email, input.email))
    .limit(1);
  if (porEmail) {
    return `E-mail ${input.email} já existe em Servidores. Vincule manualmente em vez de criar novo.`;
  }

  if (input.matricula) {
    const [porMatricula] = await db
      .select({ id: servidores.id })
      .from(servidores)
      .where(eq(servidores.matricula, input.matricula))
      .limit(1);
    if (porMatricula) {
      return `Matrícula ${input.matricula} já existe em Servidores.`;
    }
  }

  return null;
}

/**
 * Cria a entrada em `servidores` para um perfil já aprovado que ficou sem
 * vínculo (típico do bootstrap pós-limpeza: Hercules e outros que entraram
 * antes desta funcionalidade existir).
 */
export async function vincularServidorAction(
  input: VincularServidorInput,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  let parsed: VincularServidorInput;
  try {
    parsed = vincularServidorInputSchema.parse(input);
  } catch (err) {
    return toActionError(err);
  }

  const [perfil] = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      nome: profiles.nome,
      matricula: profiles.matricula,
      approved: profiles.approved,
      servidorId: profiles.servidorId,
    })
    .from(profiles)
    .where(eq(profiles.id, parsed.perfilId))
    .limit(1);

  if (!perfil) return { ok: false, error: "Perfil não encontrado." };
  if (!perfil.approved) {
    return { ok: false, error: "Aprove o perfil antes de criar o servidor." };
  }
  if (perfil.servidorId) {
    return { ok: false, error: "Este perfil já tem servidor vinculado." };
  }

  const emailNormalizado = perfil.email.trim().toLowerCase();
  const dup = await encontrarColisaoServidor({
    email: emailNormalizado,
    matricula: perfil.matricula,
  });
  if (dup) return { ok: false, error: dup };

  try {
    await db.transaction(async (tx) => {
      const [novoServidor] = await tx
        .insert(servidores)
        .values({
          nome: perfil.nome,
          apelido: parsed.apelido,
          matricula: perfil.matricula || null,
          email: emailNormalizado,
          cargo: parsed.cargo,
          tipoVinculo: parsed.tipoVinculo,
          dataIngresso: parsed.dataIngresso,
          status: "ativo",
        })
        .returning({ id: servidores.id });

      if (parsed.nucleoId) {
        await tx.insert(servidorNucleo).values({
          servidorId: novoServidor.id,
          nucleoId: parsed.nucleoId,
          isPrincipal: true,
          dataInicio: parsed.dataIngresso,
        });
      }

      await tx
        .update(profiles)
        .set({ servidorId: novoServidor.id })
        .where(eq(profiles.id, parsed.perfilId));
    });
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/admin/aprovacoes");
  revalidatePath("/servidores");
  return { ok: true };
}

export async function promoverAdminAction(
  targetId: string,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const [target] = await db
    .select({ role: profiles.role, approved: profiles.approved })
    .from(profiles)
    .where(eq(profiles.id, targetId))
    .limit(1);

  if (!target) return { ok: false, error: "Perfil não encontrado." };
  if (!target.approved) {
    return { ok: false, error: "Aprove antes de promover a admin." };
  }
  if (target.role === "admin") {
    return { ok: false, error: "Já é administrador." };
  }

  await db
    .update(profiles)
    .set({ role: "admin" })
    .where(eq(profiles.id, targetId));

  revalidatePath("/admin/aprovacoes");
  return { ok: true };
}

export async function rebaixarAdminAction(
  targetId: string,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  if (targetId === guard.adminId) {
    return { ok: false, error: "Você não pode rebaixar a si mesmo." };
  }

  const outrosAdmins = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(
      and(
        eq(profiles.role, "admin"),
        eq(profiles.approved, true),
        ne(profiles.id, targetId),
      ),
    )
    .limit(1);

  if (outrosAdmins.length === 0) {
    return {
      ok: false,
      error: "Não é possível rebaixar o único administrador do sistema.",
    };
  }

  await db
    .update(profiles)
    .set({ role: "servidor" })
    .where(eq(profiles.id, targetId));

  revalidatePath("/admin/aprovacoes");
  return { ok: true };
}

export async function revogarPerfilAction(
  targetId: string,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  if (targetId === guard.adminId) {
    return { ok: false, error: "Você não pode revogar seu próprio acesso." };
  }

  const [target] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, targetId))
    .limit(1);

  if (target?.role === "admin") {
    const outrosAdmins = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(
        and(
          eq(profiles.role, "admin"),
          eq(profiles.approved, true),
          ne(profiles.id, targetId),
        ),
      )
      .limit(1);
    if (outrosAdmins.length === 0) {
      return {
        ok: false,
        error: "Não é possível revogar o único administrador do sistema.",
      };
    }
  }

  await db
    .update(profiles)
    .set({
      approved: false,
      approvedAt: null,
      approvedBy: null,
    })
    .where(eq(profiles.id, targetId));

  revalidatePath("/admin/aprovacoes");
  return { ok: true };
}

export async function recusarPerfilAction(
  targetId: string,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  if (targetId === guard.adminId) {
    return { ok: false, error: "Você não pode remover sua própria conta." };
  }

  // Delete auth.users → cascade deleta profiles via FK ON DELETE CASCADE.
  // O servidor vinculado (se houver) sobrevive graças ao ON DELETE SET NULL
  // em profiles.servidor_id — mas o profile some junto com auth.users.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/aprovacoes");
  return { ok: true };
}
