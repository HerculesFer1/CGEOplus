# Configuração do Supabase — Guia Passo-a-Passo

Este guia descreve como criar o projeto Supabase, ativar Google OAuth e conectar ao CGEO+.

**Tempo estimado:** 15 minutos.

---

## 1. Criar conta e projeto Supabase

1. Acesse https://supabase.com e clique em **Start your project** (login com Google recomendado).
2. Clique em **New project**:
   - **Name:** `cgeo-plus`
   - **Database password:** gere e **guarde em local seguro** (será usada no `DATABASE_URL`).
   - **Region:** `South America (São Paulo)` — mais próximo, menor latência.
   - **Pricing plan:** Free.
3. Aguarde ~2 minutos até o provisionamento terminar.

---

## 2. Coletar as credenciais

No painel do projeto:

1. **Settings → API**
   - Copie **Project URL** → cole em `NEXT_PUBLIC_SUPABASE_URL`
   - Copie **anon / public key** → cole em `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copie **service_role key** (segredo!) → cole em `SUPABASE_SERVICE_ROLE_KEY`

2. **Settings → Database → Connection string**
   - Selecione a tab **Session pooler** (recomendada para Drizzle)
   - Copie a URI e substitua `[YOUR-PASSWORD]` pela senha que você gerou
   - Cole em `DATABASE_URL`

3. Copie `.env.example` para `.env.local` e cole os valores.

```bash
cp .env.example .env.local
```

---

## 3. Aplicar o schema (migrations)

```bash
# Gera SQL a partir do schema Drizzle
npx drizzle-kit generate

# Aplica no banco remoto
npx drizzle-kit push
```

Verifique no **Table Editor** do Supabase que as tabelas foram criadas:
`servidores`, `nucleos`, `servidor_nucleo`, `atividades`, `processos`, `analises`.

---

## 4. Popular dados iniciais

```bash
npx tsx src/lib/db/seed.ts
```

Isso insere os 5 núcleos, atividades base e 14 servidores (incluindo Dalila).

---

## 5. Ativar Google OAuth

### 5.1 Configurar no Google Cloud Console

1. Acesse https://console.cloud.google.com
2. Crie um novo projeto: `CGEO+ Auth`
3. **APIs & Services → OAuth consent screen:**
   - Tipo: **Internal** (se tiver Google Workspace SEMARH) ou **External**
   - App name: `CGEO+`
   - Support email: seu e-mail institucional
   - Authorized domains: `supabase.co`
4. **APIs & Services → Credentials → Create Credentials → OAuth Client ID:**
   - Application type: **Web application**
   - Name: `CGEO+ Supabase Auth`
   - **Authorized redirect URI** — pegue no painel Supabase:
     ```
     https://SEU_PROJETO.supabase.co/auth/v1/callback
     ```
5. Copie **Client ID** e **Client secret**.

### 5.2 Ativar no Supabase

1. **Authentication → Providers → Google**
2. Toggle **Enable**
3. Cole **Client ID** e **Client secret** do passo anterior
4. Save

### 5.3 Configurar URLs no Supabase

1. **Authentication → URL Configuration**
2. **Site URL:** `http://localhost:3000` (em produção troque para o domínio real)
3. **Redirect URLs (add):** `http://localhost:3000/auth/callback`

---

## 6. Testar o fluxo

```bash
npm run dev
```

1. Abra http://localhost:3000
2. Clique em **Entrar com Google**
3. Autorize com sua conta institucional
4. Você deve ser redirecionado para `/dashboard`

---

## 7. Trocar o repositório in-memory pelo Drizzle

Após validar o fluxo:

Edite [`src/lib/services/servidores.factory.ts`](../src/lib/services/servidores.factory.ts):

```typescript
import { ServidoresService } from "./servidores.service";
import { DrizzleServidorRepository } from "@/lib/repositories/servidor.drizzle";

export function getServidoresService(): ServidoresService {
  return new ServidoresService(new DrizzleServidorRepository());
}
```

*(O `DrizzleServidorRepository` será implementado na Sprint 2, seguindo a mesma interface `ServidorRepository`.)*

---

## Troubleshooting

**"prepare: false" error no Drizzle:**
Já configurado em `src/lib/db/client.ts` — necessário pelo pooler Supabase.

**Google OAuth "redirect_uri_mismatch":**
Confira que a URI no Google Cloud é **exatamente** `https://SEU_PROJETO.supabase.co/auth/v1/callback` (sem barra final).

**Session não persiste:**
Confira que `Site URL` e `Redirect URLs` no Supabase estão apontando para `http://localhost:3000` durante desenvolvimento.

**Warning "Node.js 20 deprecated":**
Aviso do Supabase JS v2.110. Funciona no Node 20, mas recomenda atualizar para 22+. Baixe em https://nodejs.org.
