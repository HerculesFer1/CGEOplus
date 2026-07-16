/**
 * Cliente HTTP para as fontes upstream (Vercel do dashboard + Supabase deles).
 *
 * Duas APIs distintas com padrões diferentes:
 *   - `fetchStaticJson`   → JSONs prontos no Vercel (`/data/*.json`)
 *   - `fetchPostgrest`    → PostgREST do Supabase upstream, com paginação Range
 *   - `callPostgrestRpc`  → RPCs (funções SQL expostas)
 *
 * Timeout curto (10s) por request — nunca queremos travar um cron do CGEO+
 * porque a infra do upstream ficou lenta. Erro é lançado e sobe pro sync.
 */

import {
  UPSTREAM_SUPABASE_ANON,
  UPSTREAM_SUPABASE_URL,
  UPSTREAM_VERCEL,
} from "./constants";

const TIMEOUT_MS = 10_000;

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(new Error(`Timeout ${ms}ms`)), ms).unref?.();
  return controller.signal;
}

/** GET `${UPSTREAM_VERCEL}/data/<name>.json`. */
export async function fetchStaticJson<T>(name: string): Promise<T> {
  const url = `${UPSTREAM_VERCEL}/data/${name}.json`;
  const res = await fetch(url, {
    signal: timeoutSignal(TIMEOUT_MS),
    // Nunca cachear no fetch server-side do Next — o cron é a única fonte
    // que precisa do valor mais recente.
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

interface PostgrestOpts {
  /** Colunas (`select=`). Sempre passe — evita puxar geometrias pesadas. */
  select: string;
  /** Filtros PostgREST: `{ ano: "gte.2022", em_alerta: "eq.true" }`. */
  filters?: Record<string, string>;
  /** Ordenação: `"pct_irregular.desc"`. */
  order?: string;
  /** Auto-paginação em chunks — o Supabase limita 1000 por resposta. */
  pageSize?: number;
}

/** GET paginado no PostgREST upstream. Retorna todas as linhas. */
export async function fetchPostgrest<T>(
  table: string,
  opts: PostgrestOpts,
): Promise<T[]> {
  const pageSize = opts.pageSize ?? 1000;
  const allRows: T[] = [];
  let from = 0;

  while (true) {
    const params = new URLSearchParams();
    params.set("select", opts.select);
    if (opts.order) params.set("order", opts.order);
    for (const [k, v] of Object.entries(opts.filters ?? {})) {
      params.set(k, v);
    }
    const url = `${UPSTREAM_SUPABASE_URL}/${table}?${params}`;

    const res = await fetch(url, {
      signal: timeoutSignal(TIMEOUT_MS),
      cache: "no-store",
      headers: {
        apikey: UPSTREAM_SUPABASE_ANON,
        Authorization: `Bearer ${UPSTREAM_SUPABASE_ANON}`,
        "Range-Unit": "items",
        Range: `${from}-${from + pageSize - 1}`,
        // `count=exact` faz o PostgREST devolver `Content-Range: 0-999/19308`
        // — sem isso, viria `0-999/*` e a paginação encerraria no primeiro chunk.
        Prefer: "count=exact",
        Accept: "application/json",
      },
    });
    if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);

    const chunk = (await res.json()) as T[];
    allRows.push(...chunk);

    // Content-Range: "0-999/19308" — fim quando `to+1 >= total`.
    const range = res.headers.get("Content-Range");
    const totalStr = range?.split("/")?.[1];
    const total = totalStr && totalStr !== "*" ? Number(totalStr) : null;
    if (total === null || allRows.length >= total || chunk.length === 0) break;
    from += pageSize;
  }
  return allRows;
}

/** POST em `rpc/<name>`. `params` = body JSON. */
export async function callPostgrestRpc<T>(
  name: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const url = `${UPSTREAM_SUPABASE_URL}/rpc/${name}`;
  const res = await fetch(url, {
    method: "POST",
    signal: timeoutSignal(TIMEOUT_MS),
    cache: "no-store",
    headers: {
      apikey: UPSTREAM_SUPABASE_ANON,
      Authorization: `Bearer ${UPSTREAM_SUPABASE_ANON}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`POST ${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}
