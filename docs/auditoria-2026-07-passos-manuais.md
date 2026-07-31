# Auditoria 2026-07 — Passos que exigem o Dashboard

> Estes itens **não** foram aplicados automaticamente porque dependem do Supabase
> Dashboard / Management API ou porque tocam no fluxo de login em produção e
> precisam de um teste de login antes de virar `main`. O restante da auditoria
> (RLS, views, revokes, bump de deps, paralelização do dashboard) já foi aplicado.

---

## 1. Proteção contra senhas vazadas (1 clique) — S-05

Supabase Dashboard → **Authentication → Policies / Passwords** →
ligar **"Leaked password protection"** (checa a senha contra o HaveIBeenPwned).

---

## 2. Proxy sem rede — a maior redução de latência percebida (P-01)

Hoje o `src/proxy.ts` faz **2 idas-e-voltas de rede por navegação**:
`auth.getUser()` (servidor de Auth) + `select approved, role from profiles`.
O objetivo é levar isso a **0 round-trips**, validando o JWT localmente e lendo
`approved`/`role` de dentro do próprio token.

São 3 passos, nesta ordem. Só troque o código (passo 2.3) **depois** de 2.1 e 2.2.

### 2.1 — Ligar JWT signing keys (assimétricas)

Dashboard → **Authentication → JWT Keys / Signing Keys** → migrar para
**chaves assimétricas (ECC/RSA)**. Isso permite ao `getClaims()` verificar o token
localmente (sem chamar o servidor de Auth). Sessões atuais continuam válidas.

### 2.2 — Custom Access Token Hook (injeta approved/role no token)

Rode este SQL (pode ser via editor SQL do Dashboard):

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  v_approved boolean;
  v_role public.user_role;
begin
  select p.approved, p.role
    into v_approved, v_role
  from public.profiles p
  where p.id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{app_metadata,approved}',
                      coalesce(to_jsonb(v_approved), 'false'::jsonb));
  claims := jsonb_set(claims, '{app_metadata,cgeo_role}',
                      coalesce(to_jsonb(v_role::text), 'null'::jsonb));

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Só o Auth pode executar o hook; ninguém mais.
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
-- O hook precisa ler profiles com o papel do Auth.
grant select on public.profiles to supabase_auth_admin;
```

Depois: Dashboard → **Authentication → Hooks → Custom Access Token** →
selecionar `public.custom_access_token_hook`.

> Os claims só aparecem em tokens **novos**. Sessões antigas continuam sem o claim
> até o próximo refresh/login — por isso o código do passo 2.3 tem *fallback*.

### 2.3 — Trocar o `proxy.ts` (com fallback seguro)

Substitua o trecho de verificação. O código lê `approved`/`role` do token; se não
estiverem lá (sessão antiga, antes do hook propagar), cai no comportamento atual.

```ts
// ... createServerClient igual ao atual ...

// getClaims valida o JWT localmente quando há signing keys assimétricas.
const { data: claimsData } = await supabase.auth.getClaims();
const claims = claimsData?.claims;

if (!claims) return redirectTo(request, "/login", path);

// Caminho rápido: approved/role vieram no token (0 round-trips).
let approved = claims.app_metadata?.approved as boolean | undefined;
let role = claims.app_metadata?.cgeo_role as string | null | undefined;

// Fallback: token antigo ainda sem os claims → 1 query (comportamento atual).
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
  return isAguardando ? response : redirectTo(request, "/aguardando-aprovacao");
}
if (isAguardando) return redirectTo(request, "/dashboard");
if (path.startsWith("/admin") && role !== "admin") {
  return redirectTo(request, "/dashboard");
}
return response;
```

### 2.4 — Testar antes de mergear

Faça o deploy em **preview** (branch, não `main`) e valide:
1. Login com usuário aprovado → cai no `/dashboard`.
2. Login com usuário não aprovado → `/aguardando-aprovacao`.
3. Não-admin tentando `/admin/...` → volta para `/dashboard`.
4. Sem sessão → `/login`.

Com os 4 ok, mergeie para `main`.

---

## 3. Itens deixados de fora de propósito (com motivo)

- **`xlsx` (SheetJS) vulnerável (D-01)** — sem correção no npm. Requer migrar o
  parsing de planilhas para o build oficial `cdn.sheetjs.com` ou para `exceljs`.
  É uma troca de biblioteca (mudança de código real), melhor em entrega dedicada.
  Mitigação enquanto isso: limitar tamanho/origem dos arquivos aceitos no upload.
- **`postcss` bundled do Next (build-time)** — só o Next resolve num patch futuro;
  não é caminho de runtime.
- **Remoção de índices "não usados"** — o advisor marca "não usado" desde o último
  reset de estatísticas; vários existem para os jobs mensais (CAR/PRODES/queimadas).
  Remover às cegas pode piorar a importação. Reavaliar após um ciclo completo.
- **Lint (~71 avisos)** — maioria é o plugin `react-hooks` novo (`error-boundaries`,
  `incompatible-library`) reagindo ao padrão `notFound()` do Next e ao React Hook
  Form. Não são bugs de runtime e não bloqueiam o build. Limpar aos poucos ou
  ajustar a config da regra — não vale churn em 66 componentes agora.

_Gerado pela auditoria de 2026-07-31._
