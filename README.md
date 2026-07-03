# CGEO+

**Sistema de Gestão e Inteligência Setorial** para o Centro de Geotecnologia Fundiária e Ambiental (SEMARH).

Estrutura organizacional, cadastro de processos, medição de produtividade e dashboards institucionais em uma única plataforma.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Linguagem | TypeScript 5 |
| Estilo | Tailwind CSS 4 · shadcn/ui · Framer Motion |
| Fonts | Inter (display) · JetBrains Mono |
| BaaS | Supabase (Auth · Postgres · Realtime · Storage) |
| ORM | Drizzle |
| Validação | Zod |
| Data client | TanStack Query |
| Gráficos | Recharts |
| Testes | Vitest + Testing Library |
| Deploy | Vercel + Supabase Cloud |

## Requisitos

- Node.js 20.9+ (recomendado 22+ para compatibilidade com Supabase v2.110)
- npm 10+
- Conta Supabase gratuita
- Conta Google Cloud para OAuth (via console Supabase)

## Setup

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# → preencha DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Gerar migrations e aplicar
npx drizzle-kit generate
npx drizzle-kit push

# 4. Popular dados iniciais
npx tsx src/lib/db/seed.ts

# 5. Rodar em desenvolvimento
npm run dev
```

Acesse http://localhost:3000

## Estrutura

```
src/
├── app/                         # Next.js App Router
│   ├── page.tsx                 # Landing pública
│   ├── login/                   # Autenticação Google
│   ├── auth/callback/           # OAuth callback
│   └── dashboard/               # Área autenticada
├── components/
│   ├── brand/                   # Logo CGEO+
│   ├── shell/                   # Sidebar, Topbar
│   ├── theme-provider.tsx       # next-themes
│   └── theme-toggle.tsx
├── lib/
│   ├── db/                      # Drizzle: schema, client, seed
│   ├── supabase/                # Client browser + server
│   ├── design/                  # Tokens + motion
│   └── utils.ts                 # cn, formatters
└── proxy.ts                     # Rotas protegidas (era "middleware" em ≤v15)
```

## Modelo de Dados

Ver [docs/mapping.md](./docs/mapping.md) para o de-para completo planilha → banco.

Entidades principais:
- **servidores** + **servidor_nucleo** — vínculos temporais N:N
- **nucleos** — Coordenação, Licenciamento, CAR, Fiscalização, Administrativo
- **atividades** — matriz N1/N2/N3 de complexidade
- **processos** — SEI / SIGA / SICAR (com finalidade Lançamento/Análise/Mapeamento)
- **analises** — múltiplas por processo, mesmo ou diferentes servidores

## Design System

Tokens em [src/lib/design/tokens.ts](./src/lib/design/tokens.ts).

- **Modo claro:** branco puro `#FFFFFF` com accent `#0071E3` (azul institucional)
- **Modo escuro:** preto puro `#000000` com accent `#0A84FF`
- **Elevação:** 5 camadas de sombra com blur backdrop
- **Motion:** springs Apple-like via Framer Motion (`src/lib/design/motion.ts`)
- **Acessibilidade:** foco visível, respeito a `prefers-reduced-motion`, contraste AA

## Scripts

```bash
npm run dev        # dev server (Turbopack)
npm run build      # build de produção
npm run start      # produção
npm run lint       # ESLint
```

## Roadmap

Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para o roadmap por sprint.

## Licença

Uso interno SEMARH.
