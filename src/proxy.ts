import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * CGEO+ Proxy (antigo "middleware" — renomeado no Next.js 16).
 *
 * Renova a sessão Supabase em cada request e protege rotas autenticadas.
 * Se as env vars do Supabase ainda não foram configuradas, o proxy age como
 * no-op — permite que o setup inicial seja explorado sem backend conectado.
 */
export async function proxy(request: NextRequest) {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Modo "sem backend" — permite navegar durante o setup inicial.
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

  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon");

  // TODO(sprint-2): remover essa flag após configurar Google OAuth no Supabase.
  // Ver docs/supabase-setup.md seção 5.
  const AUTH_BYPASS = process.env.CGEO_AUTH_BYPASS === "true";

  if (!user && !isPublic && !AUTH_BYPASS) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
