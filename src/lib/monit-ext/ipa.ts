/**
 * IPA — Índice de Pressão Ambiental (composto CGEO+)
 *
 * Score municipal 0-100 combinando as 3 pressões monitoradas:
 *   • 50% IPI MapBiomas — % da área desmatada sem instrumento válido
 *   • 30% Queimadas em áreas prioritárias — % da área queimada em classes AHP 4-5
 *   • 20% Divergência PRODES — 100 − % concordância PRODES × MapBiomas
 *
 * Municípios sem cobertura de uma das fontes têm o peso renormalizado nas
 * demais — o IPA nunca "empurra" ausência de dado como pressão zero.
 *
 * Este índice é uma leitura executiva do CGEO+, NÃO substitui as métricas
 * individuais (IPI, concordância, % em prioritárias) — cada uma continua
 * publicada em seu próprio dashboard.
 */

import { sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { computeIpaScore } from "./ipa-score";

export type { IpaEntradas, IpaScore } from "./ipa-score";
export { computeIpaScore } from "./ipa-score";

export interface IpaMunicipio {
  municipio: string;
  ipa: number;
  parcIpi: number | null;
  parcQueimadas: number | null;
  parcProdes: number | null;
  ano: number;
}

/** Calcula IPA por município para um ano. Retorna ranking desc. */
export async function getIpaRanking(ano: number, limite = 30): Promise<IpaMunicipio[]> {
  // Uma única CTE cross-joina as 3 fontes por nome de município.
  // O `municipio` do MapBiomas é a chave canônica (947 municípios do PI + variantes);
  // Queimadas usa municipio_cod, e batemos por LOWER(nome) para tolerar acentos/casing.
  const rows = await db.execute<{
    municipio: string;
    pct_irregular: string | null;
    pct_prio: string | null;
    pct_conc: string | null;
  }>(sql`
    WITH mb AS (
      SELECT municipio,
             pct_irregular::float AS pct_irregular
        FROM monit_ext_mapbiomas_municipio
       WHERE ano = ${ano}
    ),
    qm AS (
      SELECT municipio_nome AS municipio,
             pct_area_prioritaria::float AS pct_prio
        FROM monit_ext_queimadas_municipio_ano
       WHERE ano = ${ano}
    ),
    pr AS (
      SELECT municipio,
             pct_concordancia::float AS pct_conc
        FROM monit_ext_prodes_municipio
       WHERE ano = ${ano}
    )
    SELECT COALESCE(mb.municipio, qm.municipio) AS municipio,
           mb.pct_irregular,
           qm.pct_prio,
           pr.pct_conc
      FROM mb
      FULL OUTER JOIN qm ON LOWER(mb.municipio) = LOWER(qm.municipio)
      LEFT  JOIN pr ON LOWER(pr.municipio) = LOWER(COALESCE(mb.municipio, qm.municipio))
    WHERE COALESCE(mb.municipio, qm.municipio) IS NOT NULL
  `);

  const raw = (rows as unknown as { rows?: unknown[] }).rows ?? rows;
  const arr = raw as Array<{
    municipio: string;
    pct_irregular: number | string | null;
    pct_prio: number | string | null;
    pct_conc: number | string | null;
  }>;

  const scored: IpaMunicipio[] = arr.map((r) => {
    const score = computeIpaScore({
      ipi: toNum(r.pct_irregular),
      prioridade: toNum(r.pct_prio),
      concordancia: toNum(r.pct_conc),
    });
    return { municipio: r.municipio, ...score, ano };
  });

  scored.sort((a, b) => b.ipa - a.ipa);
  return scored.slice(0, limite);
}

function toNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
