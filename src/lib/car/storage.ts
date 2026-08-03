/**
 * Storage helpers do módulo CAR — sobem/baixam o CSV do SICAR direto
 * pro bucket `car-imports` do Supabase, contornando o limite de body
 * multipart do Next.js dev/prod para arquivos ~40MB.
 *
 * Fluxo:
 *   1. Cliente chama `POST /api/car/importar/signed-url` → recebe URL assinada
 *   2. Cliente faz `PUT` da CSV direto pro Supabase Storage
 *   3. Cliente chama `POST /api/car/importar/parse` (JSON) com `storagePath`
 *   4. Server baixa via `downloadCarImport(path)` com service_role e processa
 */

import { createClient } from "@supabase/supabase-js";

const BUCKET = "car-imports";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para o storage do CAR.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface SignedUploadResult {
  path: string;
  token: string;
  signedUrl: string;
}

/**
 * Gera URL assinada para upload direto do CSV.
 * Path convention: `{ano}/{mes}/{timestamp}-{filename-sanitizado}`
 */
export async function createSignedUploadUrl(
  ano: number,
  mes: number,
  filename: string,
): Promise<SignedUploadResult> {
  const supabase = getServiceClient();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${ano}/${String(mes).padStart(2, "0")}/${Date.now()}-${safe}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    throw new Error(
      `Não foi possível criar URL de upload: ${error?.message ?? "desconhecido"}`,
    );
  }
  return { path: data.path, token: data.token, signedUrl: data.signedUrl };
}

/** Baixa o CSV do storage como Buffer (server-side, service_role). */
export async function downloadCarImport(path: string): Promise<Buffer> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) {
    throw new Error(
      `Falha ao baixar arquivo do storage: ${error?.message ?? "arquivo não encontrado"}`,
    );
  }
  return Buffer.from(await data.arrayBuffer());
}

/** Remove um arquivo do bucket. Usado no cancelamento/limpeza. */
export async function deleteCarImport(path: string): Promise<void> {
  const supabase = getServiceClient();
  await supabase.storage.from(BUCKET).remove([path]);
}

/**
 * Lista recursivamente todos os arquivos (paths completos) do bucket.
 * A convenção de path é `{ano}/{mes}/{arquivo}`, então varremos 2 níveis de
 * "pastas" sintéticas do Supabase Storage (pastas têm `id === null`).
 */
export async function listAllCarImportPaths(): Promise<string[]> {
  const supabase = getServiceClient();
  const out: string[] = [];

  async function walk(prefix: string): Promise<void> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: 1000 });
    if (error || !data) return;
    for (const entry of data) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        // "pasta" sintética → desce um nível
        await walk(full);
      } else {
        out.push(full);
      }
    }
  }

  await walk("");
  return out;
}

/**
 * Remove todos os arquivos de um período (`{ano}/{mes}/`) do bucket. Usado como
 * mecanismo de limpeza: após uma importação gravar com sucesso, o CSV vira
 * órfão (o dado já está no banco; o checksum fica em `car_importacao` para
 * auditoria). Retorna a lista de paths removidos. Idempotente e best-effort:
 * nunca deve derrubar o fluxo de importação.
 */
export async function cleanupCarImportPeriod(
  ano: number,
  mes: number,
): Promise<string[]> {
  const supabase = getServiceClient();
  const prefix = `${ano}/${String(mes).padStart(2, "0")}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit: 1000 });
  if (error || !data) return [];
  const paths = data
    .filter((e) => e.id !== null)
    .map((e) => `${prefix}/${e.name}`);
  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths);
  }
  return paths;
}

/** Remove uma lista de paths do bucket, em lotes (limite de segurança da API). */
export async function removeCarImportPaths(paths: string[]): Promise<number> {
  if (paths.length === 0) return 0;
  const supabase = getServiceClient();
  const BATCH = 100;
  let removed = 0;
  for (let i = 0; i < paths.length; i += BATCH) {
    const slice = paths.slice(i, i + BATCH);
    const { error } = await supabase.storage.from(BUCKET).remove(slice);
    if (!error) removed += slice.length;
  }
  return removed;
}
