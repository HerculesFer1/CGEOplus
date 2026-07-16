/**
 * Sincronização PRODES-Cerrado.
 *
 * 4 datasets:
 *   1. Ciclo anual (concordância PRODES × MapBiomas) → `monit_ext_prodes_ciclo`
 *   2. Top municípios PRODES                         → `monit_ext_prodes_municipio`
 *   3. Vetor de pressão dominante                    → `monit_ext_prodes_vetor`
 *   4. Distribuição por faixa de cobertura           → `monit_ext_prodes_cobertura`
 *
 * Fonte: `resumo_estatico.json` (Vercel upstream) tem tudo pronto em
 * `prodesSummary` + `prodesExtra`. Mais estável do que hitar as RPCs do
 * Supabase upstream (que dependem do schema deles).
 */

import { sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  monitExtProdesCiclo,
  monitExtProdesCobertura,
  monitExtProdesMunicipio,
  monitExtProdesVetor,
} from "@/lib/db/monitoramento-externo";
import { PRODES_FAIXAS_COBERTURA, UPSTREAM_VERCEL } from "./constants";
import { fetchStaticJson } from "./upstream-client";

interface ResumoEstatico {
  prodesSummary: {
    ciclos: Record<
      string,
      { n: number; concordantes: number; discordantes: number; pct: number }
    >;
    semProdes?: number;
  };
  prodesExtra: {
    mediaCob: Record<string, number>;
    topMun: { mun: string; conc: number; total: number; pct: number }[];
    porVetor: {
      vp: string;
      n: number;
      conc: number;
      pct: number;
    }[];
    distCob: {
      labels: string[];
      n: number[];
      ha: number[];
    };
  };
}

interface SyncResult {
  registrosInseridos: number;
  detalhes: {
    ciclos: number;
    municipios: number;
    vetores: number;
    faixasCobertura: number;
  };
  fonteUrl: string;
}

function n(v: number | null | undefined): string {
  if (v === null || v === undefined) return "0";
  return String(v);
}

export async function syncProdes(): Promise<SyncResult> {
  const resumo = await fetchStaticJson<ResumoEstatico>("resumo_estatico");

  const ciclos = Object.entries(resumo.prodesSummary.ciclos).map(([ano, c]) => {
    const nTot = c.n ?? 0;
    return {
      anoProdesRef: Number(ano),
      nTotal: nTot,
      nConcordantes: c.concordantes ?? 0,
      nDiscordantes: c.discordantes ?? 0,
      nSemProdes: nTot === 0 ? (resumo.prodesSummary.semProdes ?? 0) : 0,
      pctConcordancia: c.pct !== undefined ? n(c.pct) : null,
      mediaCoberturaPct: n(resumo.prodesExtra.mediaCob[ano] ?? 0),
    };
  });

  const municipios = (resumo.prodesExtra.topMun ?? []).map((m) => ({
    municipio: m.mun,
    // topMun não tem ano — assume o ano mais recente (max dos ciclos).
    // Isso é intencional: o storytelling "top municípios PRODES" mostra
    // acumulado até o último ciclo.
    ano: Math.max(...ciclos.map((c) => c.anoProdesRef)),
    concordanteHa: n(m.conc),
    totalHa: n(m.total),
    pctConcordancia: n(m.pct),
  }));

  const vetores = (resumo.prodesExtra.porVetor ?? []).map((v) => ({
    vetor: v.vp,
    nAlertas: v.n,
    nConcordantes: v.conc,
    pctConcordancia: n(v.pct),
  }));

  const cobertura = PRODES_FAIXAS_COBERTURA.map((f) => {
    const idx = resumo.prodesExtra.distCob.labels.findIndex(
      (l) => l === f.faixa || l.replace(/–/g, "-") === f.faixa,
    );
    return {
      faixa: f.faixa,
      ordem: f.ordem,
      nAlertas: idx >= 0 ? resumo.prodesExtra.distCob.n[idx] ?? 0 : 0,
      areaHa: idx >= 0 ? n(resumo.prodesExtra.distCob.ha[idx] ?? 0) : "0",
    };
  });

  if (ciclos.length > 0) {
    await db
      .insert(monitExtProdesCiclo)
      .values(ciclos)
      .onConflictDoUpdate({
        target: monitExtProdesCiclo.anoProdesRef,
        set: {
          nTotal: sql.raw("EXCLUDED.n_total"),
          nConcordantes: sql.raw("EXCLUDED.n_concordantes"),
          nDiscordantes: sql.raw("EXCLUDED.n_discordantes"),
          nSemProdes: sql.raw("EXCLUDED.n_sem_prodes"),
          pctConcordancia: sql.raw("EXCLUDED.pct_concordancia"),
          mediaCoberturaPct: sql.raw("EXCLUDED.media_cobertura_pct"),
          atualizadoEm: sql`now()`,
        },
      });
  }

  if (municipios.length > 0) {
    const vals = municipios
      .map(
        (m) =>
          `(${sqlLit(m.municipio)}, ${m.ano}, ${m.concordanteHa}, ${m.totalHa}, ${m.pctConcordancia}, now())`,
      )
      .join(",");
    await db.execute(
      sql.raw(
        `INSERT INTO monit_ext_prodes_municipio
          (municipio, ano, concordante_ha, total_ha, pct_concordancia, atualizado_em)
        VALUES ${vals}
        ON CONFLICT (municipio, ano) DO UPDATE SET
          concordante_ha = EXCLUDED.concordante_ha,
          total_ha = EXCLUDED.total_ha,
          pct_concordancia = EXCLUDED.pct_concordancia,
          atualizado_em = now()`,
      ),
    );
  }

  if (vetores.length > 0) {
    await db
      .insert(monitExtProdesVetor)
      .values(vetores)
      .onConflictDoUpdate({
        target: monitExtProdesVetor.vetor,
        set: {
          nAlertas: sql.raw("EXCLUDED.n_alertas"),
          nConcordantes: sql.raw("EXCLUDED.n_concordantes"),
          pctConcordancia: sql.raw("EXCLUDED.pct_concordancia"),
          atualizadoEm: sql`now()`,
        },
      });
  }

  if (cobertura.length > 0) {
    await db
      .insert(monitExtProdesCobertura)
      .values(cobertura)
      .onConflictDoUpdate({
        target: monitExtProdesCobertura.faixa,
        set: {
          ordem: sql.raw("EXCLUDED.ordem"),
          nAlertas: sql.raw("EXCLUDED.n_alertas"),
          areaHa: sql.raw("EXCLUDED.area_ha"),
          atualizadoEm: sql`now()`,
        },
      });
  }

  return {
    registrosInseridos:
      ciclos.length + municipios.length + vetores.length + cobertura.length,
    detalhes: {
      ciclos: ciclos.length,
      municipios: municipios.length,
      vetores: vetores.length,
      faixasCobertura: cobertura.length,
    },
    fonteUrl: `${UPSTREAM_VERCEL}/data/resumo_estatico.json`,
  };
}

function sqlLit(s: string | null | undefined): string {
  if (s === null || s === undefined) return "NULL";
  return `'${s.replace(/'/g, "''")}'`;
}
