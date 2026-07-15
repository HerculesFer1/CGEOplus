import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service_role — bypassa RLS e tem acesso ao Admin API
 * (`supabase.auth.admin.*`, incluindo deleteUser). NUNCA importar em Client
 * Components: se essa key vazar para o browser, todo o banco fica exposto.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL não configurados.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
