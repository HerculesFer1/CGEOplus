import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { verifySessionCookie, SESSION_COOKIE } from "@/lib/auth/session";

/**
 * CGEO+ Proxy — protege rotas autenticadas.
 *
 * Aceita 3 fontes de sessão (em ordem de precedência):
 *  1. Cookie `cgeo_dev_session` — usuário de teste (modo dev)
 *  2. Supabase Auth — Google OAuth (produção)
 *  3. CGEO_AUTH_BYPASS=true — bypass total (só para explorar UI sem backend)
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/dev-login") ||
    path.startsWith("/auth") ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon");

  if (isPublic) return NextResponse.next({ request });

  // 1) Sessão de teste (dev-login)
  const testToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (testToken && verifySessionCookie(testToken)) {
    return NextResponse.next({ request });
  }

  // 2) Sessão Supabase (Google OAuth)
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supaUrl && supaKey && !supaUrl.includes("SEU_PROJETO")) {
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
    if (user) return response;
  }

  // 3) Bypass total (só para explorar UI durante setup)
  if (process.env.CGEO_AUTH_BYPASS === "true") {
    return NextResponse.next({ request });
  }

  // Não autenticado → redireciona para dev-login (não login OAuth ainda)
  const url = request.nextUrl.clone();
  url.pathname = "/dev-login";
  url.searchParams.set("next", path);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
