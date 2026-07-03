# CGEO+ · Arquitetura

## Contexto

Sistema de gestão para o Centro de Geotecnologia Fundiária e Ambiental (SEMARH).
Sucessor da planilha `PROCESSOS_CONTABILIZAR_[2026].xlsx`, com foco em:

- **Cadastro organizacional** (servidores multi-núcleo, atividades, complexidade)
- **Cadastro de processos** com múltiplas análises (mesmo ou diferentes analistas)
- **Dashboards** de produtividade, sobrecarga e projeção
- **Design premium** inspirado no padrão Apple, modo claro (branco puro) / escuro (preto puro)

## Restrições

| | |
|---|---|
| Custo | R$ 0/mês (free tier Supabase + Vercel) |
| Uptime | 99,5% (horário comercial) |
| Latência dashboard | < 500ms p95 |
| Time de manutenção | 1–2 devs |
| Compliance | LGPD |
| Acessibilidade | WCAG 2.1 AA |

## Camadas

```
┌──────────────────────────────────────────────────┐
│ UI Layer                                         │
│  Server + Client Components · Framer · shadcn    │
├──────────────────────────────────────────────────┤
│ Hooks Layer                                      │
│  TanStack Query · cache · optimistic updates     │
├──────────────────────────────────────────────────┤
│ Service Layer                                    │
│  Regras de negócio isoladas · testáveis          │
├──────────────────────────────────────────────────┤
│ Repository Layer                                 │
│  Drizzle ORM tipado · sem lógica                 │
├──────────────────────────────────────────────────┤
│ Supabase (Postgres + RLS + Auth + Realtime)      │
└──────────────────────────────────────────────────┘
```

## Modelo de Dados

Ver [`src/lib/db/schema.ts`](./src/lib/db/schema.ts) para código canônico.

### Entidades

- **servidores** — pessoas (Efetivo · Consultor · Suporte)
- **nucleos** — divisões operacionais (Coord · Licenc · CAR · Fisc · Adm)
- **servidor_nucleo** — N:N temporal (permite dissolução histórica)
- **atividades** — matriz de 28 atividades com complexidade N1/N2/N3
- **processos** — únicos por `(numero, sistema)`
- **analises** — múltiplas por processo (⭐ resolve a regra chave)

### Regras críticas no banco

- `CHECK` garante que `sicar_finalidade` só existe quando `sistema = 'SICAR'`
- `UNIQUE INDEX` parcial garante um único vínculo principal ativo por servidor
- Enums nativos do Postgres para todos os catálogos fechados

## Segurança

- **RLS** por perfil (Coordenação · Núcleo · Servidor · Visualização)
- **Auth** via Supabase + Google OAuth
- **Cookies HttpOnly** para tokens
- **Audit log** de writes
- **LGPD**: mascaramento de `requerente` para perfis restritos

## Roadmap (6-8 semanas)

### Sprint 0 — Fundações ✅ (esta entrega)
- Repo scaffold Next.js 16
- Design tokens + tema claro/escuro puros
- Framer Motion + View Transitions
- Landing page + login Google (frontend)
- Schema Drizzle completo
- Middleware/proxy de autenticação
- Shell da aplicação (sidebar, topbar, dashboard placeholder)
- Documentação (README, mapping.md, ARCHITECTURE.md)

### Sprint 1 — Backend conectado
- Criar projeto Supabase e configurar Google OAuth
- Rodar migrations Drizzle
- Rodar seed com 13 servidores + Dalila
- Testar fluxo de login end-to-end

### Sprint 2 — Cadastros
- CRUD Servidores + vínculos multi-núcleo
- CRUD Núcleos e Atividades
- Formulários com Zod + React Hook Form
- Testes de service layer (Vitest)

### Sprint 3 — Processos
- CRUD Processos + regra SICAR condicional
- Registro de análises (múltiplas por processo)
- Modo bulk-entry (planilha-like)
- Wizard de import da XLSX legada
- Testes E2E (Playwright)

### Sprint 4 — Dashboards
- Overview com 3 KPIs prioritários:
  1. Processos concluídos no mês (+ delta)
  2. Taxa de análises N3 (%)
  3. Índice de sobrecarga (0–100)
- Produtividade por servidor/núcleo (Recharts)
- Heatmap de sobrecarga
- Projeção anual

### Sprint 5 — Polimento
- Command Palette (⌘K) funcional
- Relatórios exportáveis (PDF/XLSX)
- Notificações de dissolução iminente
- Auditoria + hardening LGPD
- Performance tuning + a11y audit

## Decisões (ADRs resumidas)

| # | Decisão | Justificativa |
|---|---|---|
| 001 | Next.js + Supabase | Free tier, produtividade máxima, sem SRE |
| 002 | Drizzle ORM | Type-safe, migrations versionadas, Postgres nativo |
| 003 | SICAR normalizado | `sistema=SICAR` + `finalidade` (evita 3 enum-values) |
| 004 | Preto/branco puros | Requisito explícito do stakeholder |
| 005 | Framer Motion sobre CSS puro | Springs Apple-like, layoutId para transições |
| 006 | Server Components padrão | Bundle menor, dados fresh, cache automático |
