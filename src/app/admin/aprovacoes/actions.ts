"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

export async function aprovarPerfilAction(
  targetId: string,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  await db
    .update(profiles)
    .set({
      approved: true,
      approvedAt: new Date(),
      approvedBy: guard.adminId,
    })
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

  // Bloqueia revogar admin se restaria zero admins ativos
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

  // Delete auth.users → cascade deleta profiles via FK ON DELETE CASCADE
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/aprovacoes");
  return { ok: true };
}
