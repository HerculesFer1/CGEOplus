/**
 * Núcleo puro do IPA — Índice de Pressão Ambiental composto (CGEO+).
 *
 * Isolado de `ipa.ts` (que importa o cliente Drizzle) para que a lógica de
 * cálculo seja testável sem banco e sem `DATABASE_URL`. Sem efeitos colaterais
 * de import — depende apenas dos pesos em `constants`.
 *
 * Combina as 3 pressões monitoradas:
 *   • 50% IPI MapBiomas — % da área desmatada sem instrumento válido
 *   • 30% Queimadas em áreas prioritárias — % da área queimada em classes AHP 4-5
 *   • 20% Divergência PRODES — 100 − % concordância PRODES × MapBiomas
 *
 * Fonte ausente (null) não entra como pressão zero — o peso é renormalizado
 * nas demais.
 */

import { IPA_PESOS } from "./constants";

export interface IpaEntradas {
  /** % da área desmatada sem instrumento válido (IPI MapBiomas). */
  ipi: number | null;
  /** % da área queimada em classes AHP 4-5 (queimadas em prioritária). */
  prioridade: number | null;
  /** % de concordância PRODES × MapBiomas (será convertida em divergência). */
  concordancia: number | null;
}

export interface IpaScore {
  ipa: number;
  parcIpi: number | null;
  parcQueimadas: number | null;
  parcProdes: number | null;
}

/**
 * Combina as 3 pressões com renormalização de pesos para as fontes presentes.
 * A divergência PRODES é `max(0, 100 − concordância)`.
 */
export function computeIpaScore({ ipi, prioridade, concordancia }: IpaEntradas): IpaScore {
  const divProdes = concordancia !== null ? Math.max(0, 100 - concordancia) : null;

  const parcelas: Array<[number, number]> = [];
  if (ipi !== null) parcelas.push([IPA_PESOS.ipi, ipi]);
  if (prioridade !== null) parcelas.push([IPA_PESOS.fogoEmPrioritaria, prioridade]);
  if (divProdes !== null) parcelas.push([IPA_PESOS.divergenciaProdes, divProdes]);

  const somaPesos = parcelas.reduce((s, [w]) => s + w, 0);
  const ipa =
    somaPesos > 0
      ? parcelas.reduce((s, [w, v]) => s + (w / somaPesos) * v, 0)
      : 0;

  return {
    ipa: Math.round(ipa * 10) / 10,
    parcIpi: ipi,
    parcQueimadas: prioridade,
    parcProdes: divProdes,
  };
}
