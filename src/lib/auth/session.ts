/**
 * Sessão do CGEO+ — helpers para ler o perfil autenticado nos Server Components,
 * Server Actions e Route Handlers.
 *
 * Fluxo: `supabase.auth.getUser()` (via cookie SSR) → id do auth.users → busca
 * a linha correspondente em `public.profiles` via Drizzle. Retorna `null` se o
 * usuário não está autenticado ou não tem profile ainda (janela mínima entre
 * `signUp` e o trigger `handle_new_user`).
 */

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { profiles, type Profile } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export type { Profile } from "@/lib/db/schema";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return profile ?? null;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("Não autenticado.");
  }
  return profile;
}
