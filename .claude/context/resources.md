# Recursos externos do CGEO+

Ponteiros para todos os recursos externos do projeto. Consulte antes de precisar de URL, ID ou callback.

## Repositório

- **GitHub:** https://github.com/HerculesFer1/CGEOplus (branch principal: `main`)
- Clonagem: `gh repo clone HerculesFer1/CGEOplus`

## Deploy

- **Vercel produção:** https://cgeoplus.vercel.app
- **Dashboard Vercel:** https://vercel.com/dashboard → projeto `cgeoplus`
- Auto-deploy do `main`. Env vars ficam em Vercel → Settings → Environment Variables (não versionar).

## Supabase

- **Projeto:** `saobnvhhewwpzwsgyuaa` (região `sa-east-1`, criado em 2026-07-02)
- **Dashboard:** https://supabase.com/dashboard/project/saobnvhhewwpzwsgyuaa
- **API URL:** https://saobnvhhewwpzwsgyuaa.supabase.co
- **DB direct host:** `db.saobnvhhewwpzwsgyuaa.supabase.co:5432` (IPv6)
- **DB pooler host:** `aws-1-sa-east-1.pooler.supabase.com:5432` (session) / `:6543` (transaction).
  **Usar `aws-1`, não `aws-0`.**
- **Callback OAuth interno do Supabase:** `https://saobnvhhewwpzwsgyuaa.supabase.co/auth/v1/callback`

## Chaves e secrets

Nunca colocar em código nem commit. Todas ficam no Supabase Dashboard → Settings → API:

- `anon` (public) — pode ir para `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` (secret) — só server-side, para `SUPABASE_SERVICE_ROLE_KEY`
- Senha do DB (para `DATABASE_URL`): registrada quando o projeto foi criado; se perder,
  resetar em Settings → Database → Database password.

## URLs de callback OAuth (Google)

Quando configurar o provider Google, adicionar:

**Google Cloud Console → Credentials → OAuth 2.0 Client → Authorized redirect URIs:**
- `https://saobnvhhewwpzwsgyuaa.supabase.co/auth/v1/callback` (o Supabase intercepta e redireciona)

**Supabase → Authentication → URL Configuration → Redirect URLs:**
- `http://localhost:3000/auth/callback` (dev)
- `https://cgeoplus.vercel.app/auth/callback` (prod)
- Qualquer URL adicional de preview do Vercel se quiser testar branch deploys.

Ver [Contexto do projeto](./project-context.md) para stack e fase atual.
