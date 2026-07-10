/**
 * Classificador do CAR — aplica o mapa persistente Fase → Bucket
 * (`car_fase_bucket_map`) sobre as linhas parseadas.
 *
 * Design:
 *   - Fase não presente no mapa → NAO_CLASSIFICADO (linha não é descartada;
 *     entra no dashboard como categoria própria). O modal de importação
 *     pergunta ao operador para qual bucket cada fase nova pertence e
 *     grava a resolução no mapa.
 *   - O resultado inclui um `CarPreview` pronto para o modal renderizar
 *     e para persistir em `car_importacao.resumo` (JSONB).
 */

import {
  CAR_BUCKETS_AGREGADOS,
  CAR_SITUACOES,
  type CarBucket,
  type CarPreview,
  type CarSituacao,
  type ClassifiedCarRow,
  type ParsedCarRow,
} from "./types";

export interface ClassifyResult {
  classified: ClassifiedCarRow[];
  preview: CarPreview;
}

/** Aplica um mapa Fase→Bucket sobre as linhas e monta o preview agregado. */
export function classifyRows(
  rows: ParsedCarRow[],
  map: ReadonlyMap<string, CarBucket>,
): ClassifyResult {
  const classified: ClassifiedCarRow[] = new Array(rows.length);

  const totalPorBucket = zeroPorBucket();
  const totalPorSituacao = zeroPorSituacao();
  const contagemPorFase = new Map<string, { bucket: CarBucket; count: number }>();
  const contagemPorMunicipio = new Map<
    string,
    { total: number; porBucket: Partial<Record<CarBucket, number>> }
  >();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const bucket: CarBucket = map.get(row.faseOriginal) ?? "NAO_CLASSIFICADO";

    classified[i] = { ...row, bucket };

    totalPorBucket[bucket]++;
    totalPorSituacao[row.situacao]++;

    const jaVista = contagemPorFase.get(row.faseOriginal);
    if (jaVista) jaVista.count++;
    else contagemPorFase.set(row.faseOriginal, { bucket, count: 1 });

    const mun = contagemPorMunicipio.get(row.municipio);
    if (mun) {
      mun.total++;
      mun.porBucket[bucket] = (mun.porBucket[bucket] ?? 0) + 1;
    } else {
      contagemPorMunicipio.set(row.municipio, {
        total: 1,
        porBucket: { [bucket]: 1 },
      });
    }
  }

  const fasesReconhecidas: CarPreview["fasesReconhecidas"] = [];
  const fasesNaoClassificadas: CarPreview["fasesNaoClassificadas"] = [];
  for (const [fase, info] of contagemPorFase) {
    if (info.bucket === "NAO_CLASSIFICADO") {
      fasesNaoClassificadas.push({ fase, count: info.count });
    } else {
      fasesReconhecidas.push({ fase, bucket: info.bucket, count: info.count });
    }
  }
  // Ordena por contagem desc (dashboard e modal usam essa ordem).
  fasesReconhecidas.sort((a, b) => b.count - a.count);
  fasesNaoClassificadas.sort((a, b) => b.count - a.count);

  const porMunicipio = Array.from(contagemPorMunicipio.entries())
    .map(([municipio, v]) => ({
      municipio,
      total: v.total,
      porBucket: v.porBucket,
    }))
    .sort((a, b) => b.total - a.total);

  const preview: CarPreview = {
    totalRegistros: rows.length,
    totalPorBucket,
    totalPorSituacao,
    porMunicipio,
    fasesReconhecidas,
    fasesNaoClassificadas,
  };

  return { classified, preview };
}

/**
 * Reaplica um mapeamento parcial (resolvido pelo operador no modal) sobre
 * um resultado de classificação. Usado quando o operador escolhe buckets
 * para fases novas antes de gravar — evita reprocessar as ~334k linhas
 * do zero, atualizando só as que caíram em NAO_CLASSIFICADO.
 */
export function applyManualResolutions(
  prior: ClassifyResult,
  resolutions: ReadonlyMap<string, CarBucket>,
): ClassifyResult {
  if (resolutions.size === 0) return prior;

  const classified = prior.classified.map((r) => {
    if (r.bucket !== "NAO_CLASSIFICADO") return r;
    const novo = resolutions.get(r.faseOriginal);
    return novo ? { ...r, bucket: novo } : r;
  });

  // Reagrega — barato porque só percorre a lista uma vez.
  const map = new Map<string, CarBucket>();
  for (const [fase, bucket] of resolutions) map.set(fase, bucket);
  // Fases que já estavam reconhecidas devem manter seu bucket original.
  for (const f of prior.preview.fasesReconhecidas) map.set(f.fase, f.bucket);

  return classifyRows(prior.classified as ParsedCarRow[], map);
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function zeroPorBucket(): Record<CarBucket, number> {
  const o = {} as Record<CarBucket, number>;
  for (const b of CAR_BUCKETS_AGREGADOS) o[b] = 0;
  return o;
}

function zeroPorSituacao(): Record<CarSituacao, number> {
  const o = {} as Record<CarSituacao, number>;
  for (const s of CAR_SITUACOES) o[s] = 0;
  return o;
}
