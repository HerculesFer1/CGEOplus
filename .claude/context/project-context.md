# CGEO+ — Contexto do Projeto

> Este arquivo é auto-carregado pelo Claude Code via `CLAUDE.md`. É a fonte da verdade
> portátil do contexto do projeto — sobrevive a clones em qualquer máquina.

Sistema de Gestão e Inteligência Setorial para o Centro de Geotecnologia Fundiária
e Ambiental (SEMARH). Uso interno.

## Onde vive

- **Repo GitHub:** `HerculesFer1/CGEOplus` (branch principal: `main`)
- **Deploy Vercel:** https://cgeoplus.vercel.app (auto-deploy do `main`; qualquer push dispara build)
- **Supabase:** projeto `saobnvhhewwpzwsgyuaa` em `sa-east-1` — https://supabase.com/dashboard/project/saobnvhhewwpzwsgyuaa

## Stack (Next.js 16 breaking — leia `AGENTS.md`)

- **Next.js 16.2.10 App Router** com Turbopack. **`proxy.ts` substituiu `middleware.ts`**
  (mesma API, export nomeado `proxy`). Documentação em
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
- React 19, TypeScript 5, Tailwind 4, shadcn/ui, Framer Motion, next-themes.
- **Drizzle ORM** (`drizzle-orm/postgres-js`) para queries. Cliente único em
  `src/lib/db/client.ts` com `postgres.js` (`max=1`, `prepare=false` — serverless-friendly).
- **Supabase** para Auth e DB. **supabase-js só é usado no fluxo OAuth**
  (`src/lib/supabase/{client,server}.ts` + `/login` + `/auth/callback`). **Dados vêm
  todos via Drizzle** — não via REST/RPC do Supabase.
- Validação: Zod. Data: TanStack Query. Gráficos: Recharts. Testes: Vitest.
- Calendário custom: `react-day-picker` v10 + Popover (Radix) em `src/components/ui/{popover,calendar,date-picker}.tsx`.

## Arquitetura — 3 pontos não-óbvios do código

1. **RLS + Drizzle:** todas as 6 tabelas do `public` têm RLS ativado (default-deny,
   sem policies). Drizzle conecta como role `postgres` (`rolbypassrls = true`), então
   bypassa RLS. Isso é intencional: RLS existe para bloquear ataques via `anon key`
   exposto no browser. Se um dia migrar queries para supabase-js, precisará desenhar
   policies.

2. **Dois sistemas de migration em paralelo:**
   - Drizzle local em `drizzle/migrations/` (arquivos `0000_*.sql`, `0001_*.sql`,
     `0002_*.sql`). O `_journal.json` só rastreia o `0000` — os outros foram aplicados
     manualmente.
   - Supabase remoto tem tracking próprio (timestamps). **Fonte da verdade real do
     schema é o Supabase.** Rodar `drizzle-kit generate` gera arquivo redundante — o
     `schema.ts` já está em sync com o banco. **Não usar `drizzle-kit push` sem checar
     drift primeiro.**

3. **3 modos de auth** no `src/proxy.ts` (ordem de precedência):
   - Cookie assinado HMAC-SHA256 `cgeo_dev_session` — usuários de teste em
     `src/lib/auth/test-users.ts`, TTL 12h
   - Sessão Supabase (Google OAuth) — só ativa se `NEXT_PUBLIC_SUPABASE_URL` não for placeholder
   - `CGEO_AUTH_BYPASS=true` — bypass total (só para explorar UI sem backend)

## Fase atual

Última entrega foi a **refatoração completa da página `/servidores`**
(commits `4125b0c`, `cf0599c`, `020aebb`, `086259a`):

- Grid de mini-cards horizontais agrupados: Gerência primeiro, depois por vínculo
  (Efetivo → Projeto PSI → Projeto Pilares II → Terceirizado → Suporte)
- Cards com foto/iniciais na cor do núcleo, apelido + nome, badges de formação e
  vínculo, faixa festiva de aniversário se ≤5 dias
- Modal de detalhe (view/editar/remover) reutilizando o form dialog existente
- Novo enum `Terceirizado` (migration Supabase)
- Rename display: "Consultor PSI"/"Consultor Pilares II" → "Projeto PSI"/"Projeto Pilares II"
  **apenas na página `/servidores`** (valor no DB permanece "Consultor…")
- Calendário custom no tema escuro com grids de popover (mês 3×4, ano 5×2 com nav de década)
- Página `not-found.tsx` custom no tema
- Redirects singular→plural em `next.config.ts` (`/servidor` → `/servidores` etc.)

**Próxima frente:** **Google OAuth institucional.** Infraestrutura de código já está
pronta (`/login`, `/auth/callback`, `supabase/{client,server}.ts`) — falta configurar
o provider no Google Cloud + Supabase Dashboard, testar o fluxo e possivelmente
restringir domínio (`@semarh.gov.br`).

## Variáveis de ambiente

Localmente em `.env.local` (nunca commitar); em produção em Vercel → Settings → Environment Variables.

- `NEXT_PUBLIC_SUPABASE_URL` = `https://saobnvhhewwpzwsgyuaa.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — JWT anon do projeto (público)
- `SUPABASE_SERVICE_ROLE_KEY` — **secret**, do Supabase Dashboard → Settings → API
- `DATABASE_URL` — connection string do Session Pooler.
  **Pooler correto é `aws-1-sa-east-1`**, não `aws-0`. Formato:
  `postgresql://postgres.saobnvhhewwpzwsgyuaa:SENHA@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`.
  Senhas com caracteres especiais (`!` etc.) precisam URL-encode (ex.: `%21`).
- `CGEO_SESSION_SECRET` — 32+ chars aleatórios para HMAC do dev-login.
  Gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## Enums do banco (para não errar em type checks)

```ts
vinculo:        ["Efetivo", "Consultor", "Consultor PSI", "Consultor Pilares II", "Terceirizado", "Suporte"]
sistema:        ["SEI", "SIGA", "SICAR", "SINAFLOR"]
complexidade:   ["N1", "N2", "N3"]
statusServidor: ["ativo", "inativo", "afastado"]
```

O tipo local `DbVinculo` em `src/lib/repositories/servidor.drizzle.ts` **deve espelhar
o enum acima** — foi origem de build quebrado no Vercel quando esqueceram do
"Terceirizado".

## Volumetria atual (2026-07)

14–15 servidores · 6 núcleos · 7 atividades · ~4.140 processos únicos · ~4.837 análises.

## Convenções observadas

- **Idioma:** Português em toda a UI e nas respostas do Claude (o usuário responde em pt-BR).
- **Commits em pt-BR** com prefixo tipo `feat(escopo):`, `fix(escopo):`, corpo com
  contexto do *porquê*. Co-author do Claude no rodapé quando for código gerado.
- **Aliases de import:** `@/*` → `./src/*`.
- **Sem `middleware.ts`** — é `proxy.ts`. Se criar `middleware.ts`, Next 16 avisa/quebra.

Ver [Recursos externos](./resources.md) para URLs, IDs e callbacks OAuth.
