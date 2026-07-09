/**
 * Importer de planilha de monitoramento.
 *
 * Recebe as linhas parseadas + o programa alvo (PSI/PILARES II) e:
 *   1. Deriva o intervalo pelo campo data_assinatura
 *   2. Encontra ou cria a comunidade (dedup por slug)
 *   3. Insere títulos com dedup por (processo_sei, comunidade, data)
 *   4. Registra o import na tabela `imports` para auditoria
 */

import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  comunidades,
  imports,
  programaIntervalos,
  programas,
  titulos,
} from "@/lib/db/monitoramento";
import type { LinhaTitulo } from "./planilha-parser";
import { slugComunidade } from "./planilha-parser";

/* ---------- Tipos ---------- */

export interface ImportPreview {
  programa: { id: string; sigla: string; nome: string };
  totalLinhas: number;
  totalErros: number;
  linhasSemIntervalo: number;
  linhasParaInserir: number;
  linhasDuplicadas: number;
  comunidadesNovas: string[]; // slugs
  intervalos: { rotulo: string; qtd: number }[];
  amostra: {
    aba: string;
    linhaNumero: number;
    comunidade: string;
    municipio: string | null;
    dataAssinatura: string;
    intervaloRotulo: string | null;
    processoSei: string | null;
    car: string;
    duplicado: boolean;
  }[];
}

export interface ImportCommitStats {
  totalLinhas: number;
  titulosInseridos: number;
  duplicados: number;
  semIntervalo: number;
  comunidadesCriadas: number;
  importId: string;
}

/* ---------- Helpers ---------- */

async function getProgramaBySigla(sigla: string) {
  const rows = await db.select().from(programas).where(eq(programas.sigla, sigla));
  if (rows.length === 0) throw new Error(`Programa "${sigla}" não encontrado.`);
  return rows[0];
}

async function getIntervalosDoPrograma(programaId: string) {
  return db
    .select()
    .from(programaIntervalos)
    .where(eq(programaIntervalos.programaId, programaId));
}

function pickIntervalo(
  intervalos: Awaited<ReturnType<typeof getIntervalosDoPrograma>>,
  dataAssinatura: string,
) {
  return intervalos.find(
    (i) => i.dataInicio <= dataAssinatura && dataAssinatura <= i.dataFim,
  );
}

function hashCpf(cpf: string | null): string | null {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, "");
  if (!digits) return null;
  return createHash("sha256").update(digits).digest("hex");
}

/**
 * Índice em memória para dedup de comunidades já existentes.
 * Chave: slug (uppercase sem acento).
 */
async function loadComunidadeIndex(slugs: string[]) {
  if (slugs.length === 0) return new Map<string, string>();
  const rows = await db
    .select({ id: comunidades.id, slug: comunidades.slug })
    .from(comunidades)
    .where(inArray(comunidades.slug, slugs));
  return new Map(rows.map((r) => [r.slug, r.id]));
}

/**
 * Índice em memória de títulos já existentes p/ dedup.
 * Chave: `${processo_sei}|${comunidade_id}|${data}`.
 */
async function loadTituloIndex(
  programaId: string,
  intervaloIds: string[],
) {
  if (intervaloIds.length === 0) return new Set<string>();
  const rows = await db
    .select({
      processoSei: titulos.processoSei,
      comunidadeId: titulos.comunidadeId,
      dataAssinatura: titulos.dataAssinatura,
    })
    .from(titulos)
    .where(
      and(
        eq(titulos.programaId, programaId),
        inArray(titulos.intervaloId, intervaloIds),
      ),
    );
  return new Set(
    rows
      .filter((r) => r.processoSei)
      .map((r) => `${r.processoSei}|${r.comunidadeId}|${r.dataAssinatura}`),
  );
}

/* ---------- Preview ---------- */

export async function buildPreview(
  linhas: LinhaTitulo[],
  programaSigla: string,
): Promise<ImportPreview> {
  const programa = await getProgramaBySigla(programaSigla);
  const intervalos = await getIntervalosDoPrograma(programa.id);

  const slugs = Array.from(new Set(linhas.map((l) => slugComunidade(l.comunidadeNome))));
  const comIndex = await loadComunidadeIndex(slugs);
  const comunidadesNovas = slugs.filter((s) => !comIndex.has(s));

  // Para o preview de duplicados, precisamos considerar comunidades já existentes.
  // Comunidades novas ainda não têm ID — logo não podem ter títulos duplicados no banco.
  const tituloKeys = await loadTituloIndex(
    programa.id,
    intervalos.map((i) => i.id),
  );

  const intervaloCount = new Map<string, number>();
  let linhasSemIntervalo = 0;
  let linhasDuplicadas = 0;

  const amostra: ImportPreview["amostra"] = [];

  for (const l of linhas) {
    const intervalo = pickIntervalo(intervalos, l.dataAssinatura);
    if (!intervalo) {
      linhasSemIntervalo++;
      continue;
    }
    const rotulo = intervalo.rotulo;
    intervaloCount.set(rotulo, (intervaloCount.get(rotulo) ?? 0) + 1);

    const slug = slugComunidade(l.comunidadeNome);
    const comId = comIndex.get(slug);
    let duplicado = false;
    if (l.processoSei && comId) {
      const key = `${l.processoSei}|${comId}|${l.dataAssinatura}`;
      if (tituloKeys.has(key)) duplicado = true;
    }
    if (duplicado) linhasDuplicadas++;

    if (amostra.length < 20) {
      amostra.push({
        aba: l.aba,
        linhaNumero: l.linhaNumero,
        comunidade: l.comunidadeNome,
        municipio: l.municipio,
        dataAssinatura: l.dataAssinatura,
        intervaloRotulo: rotulo,
        processoSei: l.processoSei,
        car: l.carStatus,
        duplicado,
      });
    }
  }

  return {
    programa: { id: programa.id, sigla: programa.sigla, nome: programa.nome },
    totalLinhas: linhas.length,
    totalErros: 0,
    linhasSemIntervalo,
    linhasParaInserir: linhas.length - linhasSemIntervalo - linhasDuplicadas,
    linhasDuplicadas,
    comunidadesNovas,
    intervalos: Array.from(intervaloCount.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([rotulo, qtd]) => ({ rotulo, qtd })),
    amostra,
  };
}

/* ---------- Commit ---------- */

export async function commitImport(
  linhas: LinhaTitulo[],
  programaSigla: string,
  arquivoNome: string,
  arquivoBuffer: Buffer,
): Promise<ImportCommitStats> {
  const programa = await getProgramaBySigla(programaSigla);
  const intervalos = await getIntervalosDoPrograma(programa.id);

  const checksum = createHash("sha256").update(arquivoBuffer).digest("hex");

  const [importRow] = await db
    .insert(imports)
    .values({
      origem: "PLANILHA_MONITORAMENTO",
      arquivoNome,
      arquivoChecksum: checksum,
      programaId: programa.id,
      resumo: { linhas: linhas.length },
    })
    .returning({ id: imports.id });

  // 1. Garantir comunidades — busca tudo primeiro, insere as faltantes.
  const slugSet = Array.from(
    new Map(linhas.map((l) => [slugComunidade(l.comunidadeNome), l])).entries(),
  );
  const slugs = slugSet.map(([s]) => s);
  const existing = await loadComunidadeIndex(slugs);

  const inserirComunidades = slugSet
    .filter(([s]) => !existing.has(s))
    .map(([slug, l]) => ({
      nomeCanonico: l.comunidadeNome,
      slug,
      tipo: "OUTRO" as const,
      municipio: l.municipio ?? null,
      territorio: l.territorio ?? null,
    }));

  let comunidadesCriadas = 0;
  if (inserirComunidades.length > 0) {
    const inserted = await db
      .insert(comunidades)
      .values(inserirComunidades)
      .onConflictDoNothing({ target: comunidades.slug })
      .returning({ id: comunidades.id, slug: comunidades.slug });
    for (const r of inserted) existing.set(r.slug, r.id);
    // pega os que colidiram no ON CONFLICT
    if (inserted.length < inserirComunidades.length) {
      const restantes = await loadComunidadeIndex(
        inserirComunidades.map((c) => c.slug).filter((s) => !existing.has(s)),
      );
      for (const [s, id] of restantes) existing.set(s, id);
    }
    comunidadesCriadas = inserted.length;
  }

  // 2. Índice de títulos já existentes para dedup.
  const tituloKeys = await loadTituloIndex(
    programa.id,
    intervalos.map((i) => i.id),
  );

  // 3. Preparar batch de títulos válidos + não duplicados.
  const paraInserir: (typeof titulos.$inferInsert)[] = [];
  let semIntervalo = 0;
  let duplicados = 0;

  for (const l of linhas) {
    const intervalo = pickIntervalo(intervalos, l.dataAssinatura);
    if (!intervalo) {
      semIntervalo++;
      continue;
    }
    const slug = slugComunidade(l.comunidadeNome);
    const comId = existing.get(slug);
    if (!comId) {
      semIntervalo++; // segurança — não deveria ocorrer
      continue;
    }
    if (l.processoSei) {
      const key = `${l.processoSei}|${comId}|${l.dataAssinatura}`;
      if (tituloKeys.has(key)) {
        duplicados++;
        continue;
      }
      tituloKeys.add(key);
    }

    paraInserir.push({
      programaId: programa.id,
      intervaloId: intervalo.id,
      comunidadeId: comId,
      processoSei: l.processoSei,
      beneficiarioMasked: l.beneficiario,
      cpfHash: hashCpf(l.cpfRaw),
      genero: l.genero,
      estadoCivil: l.estadoCivil,
      tipoImovel: l.tipoImovel,
      municipio: l.municipio,
      territorio: l.territorio,
      numeroTitulos: l.numeroTitulos || 1,
      numeroFamilias: l.numeroFamilias || 1,
      tipo: l.tipo,
      categoriaTitulo: l.categoriaTitulo,
      dataAssinatura: l.dataAssinatura,
      carStatus: l.carStatus,
      reciboCar: l.reciboCar,
      nomeLote: l.nomeLote,
      obsCar: l.obsCar,
      cadastranteCar: l.cadastranteCar,
      projeto: l.projeto,
      sncr: l.sncr,
      faseProcesso: l.faseProcesso,
      conferenciaCpfProprietario: l.conferenciaCpfProprietario,
      conferenciaProprietario: l.conferenciaProprietario,
      conferenciaCadastrante: l.conferenciaCadastrante,
      importId: importRow.id,
    });
  }

  // 4. Insere em chunks (o índice único ux_titulo_dedup ainda é a rede final).
  let inseridos = 0;
  const CHUNK = 500;
  for (let i = 0; i < paraInserir.length; i += CHUNK) {
    const chunk = paraInserir.slice(i, i + CHUNK);
    // O índice único ux_titulo_dedup é PARCIAL (WHERE processo_sei IS NOT NULL),
    // e Postgres não infere ON CONFLICT por target em índices parciais.
    // A rede de dedup já ocorre em memória com tituloKeys; onConflictDoNothing()
    // sem target cobre casos residuais (ex.: race entre imports paralelos).
    const inserted = await db
      .insert(titulos)
      .values(chunk)
      .onConflictDoNothing()
      .returning({ id: titulos.id });
    inseridos += inserted.length;
    if (inserted.length < chunk.length) {
      duplicados += chunk.length - inserted.length;
    }
  }

  // 5. Atualiza resumo do import.
  await db
    .update(imports)
    .set({
      resumo: {
        linhas: linhas.length,
        titulosInseridos: inseridos,
        duplicados,
        semIntervalo,
        comunidadesCriadas,
      },
    })
    .where(eq(imports.id, importRow.id));

  return {
    totalLinhas: linhas.length,
    titulosInseridos: inseridos,
    duplicados,
    semIntervalo,
    comunidadesCriadas,
    importId: importRow.id,
  };
}
