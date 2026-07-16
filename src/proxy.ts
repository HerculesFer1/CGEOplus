import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * CGEO+ Proxy — gate de autenticação em edge runtime.
 *
 * Regras:
 *  - Rotas públicas passam livres
 *  - Sem sessão Supabase → /login
 *  - Sessão + approved=false → /aguardando-aprovacao
 *  - /admin/* exige role='admin' (defesa em profundidade — layout também checa)
 *  - Só aprovados acessam /dashboard e o restante do app
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isPublic =
    path === "/" ||
    path === "/login" ||
    path === "/cadastro" ||
    path === "/esqueci-senha" ||
    path.startsWith("/auth/") ||
    path.startsWith("/api/cron/") ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon");

  if (isPublic) return NextResponse.next({ request });

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Se as env vars não estão configuradas, deixa passar para evitar bootloop em setup.
  if (!supaUrl || !supaKey || supaUrl.includes("SEU_PROJETO")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supaUrl, supaKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirectTo(request, "/login", path);

  // Busca approved + role via RLS (policy profiles_select_own libera o próprio).
  const { data: profile } = await supabase
    .from("profiles")
    .select("approved, role")
    .eq("id", user.id)
    .maybeSingle();

  const isAguardando = path === "/aguardando-aprovacao";

  if (!profile?.approved) {
    return isAguardando
      ? response
      : redirectTo(request, "/aguardando-aprovacao");
  }

  // Aprovado tentando ver a tela de espera → manda para o dashboard.
  if (isAguardando) return redirectTo(request, "/dashboard");

  if (path.startsWith("/admin") && profile.role !== "admin") {
    return redirectTo(request, "/dashboard");
  }

  return response;
}

function redirectTo(request: NextRequest, to: string, next?: string) {
  const url = request.nextUrl.clone();
  url.pathname = to;
  url.search = "";
  if (next && to === "/login") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
