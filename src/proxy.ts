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

  // getClaims valida o JWT localmente quando o projeto usa signing keys
  // assimétricas (0 round-trips). Com chaves legadas (HS256) ele recai no
  // mesmo caminho de validação remota do getUser — ou seja, sem regressão.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (!claims?.sub) return redirectTo(request, "/login", path);

  // Caminho rápido: approved + cgeo_role vêm injetados no token pelo custom
  // access token hook (public.custom_access_token_hook). Enquanto o hook não
  // estiver registrado — ou em sessões emitidas antes dele — caímos no
  // fallback com uma query a profiles, idêntico ao comportamento anterior.
  const appMeta = (claims.app_metadata ?? {}) as {
    approved?: boolean;
    cgeo_role?: string | null;
  };
  let approved = appMeta.approved;
  let role: string | null | undefined = appMeta.cgeo_role;

  if (approved === undefined) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("approved, role")
      .eq("id", claims.sub)
      .maybeSingle();
    approved = profile?.approved ?? false;
    role = profile?.role ?? null;
  }

  const isAguardando = path === "/aguardando-aprovacao";

  if (!approved) {
    return isAguardando
      ? response
      : redirectTo(request, "/aguardando-aprovacao");
  }

  // Aprovado tentando ver a tela de espera → manda para o dashboard.
  if (isAguardando) return redirectTo(request, "/dashboard");

  if (path.startsWith("/admin") && role !== "admin") {
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
