/**
 * Registry central dos dashboards apresentáveis do CGEO+.
 *
 * Cada entrada declara um módulo que pode ser adicionado a um roteiro de
 * apresentação encadeada em `/apresentacao/dashboards`. Adicionar um novo
 * módulo é uma linha aqui — o resto (montador, capa, navegação) é genérico.
 *
 * O `href` aponta pra rota do dashboard "modo apresentação" (não a landing).
 * A capa antes de cada módulo usa `cor` + `nome` como identidade visual.
 */

export interface ApresentacaoModulo {
  id: string;
  nome: string;
  descricao: string;
  cor: string;
  href: string;
  /** Nº aproximado de slides internos — só pra ajudar o usuário a planejar. */
  slidesAproximado: number;
  /** Emoji minimalista pra o card do montador; sem depender de lucide. */
  icone: string;
}

export const APRESENTACAO_MODULOS: ApresentacaoModulo[] = [
  {
    id: "queimadas",
    nome: "Queimadas INPE",
    descricao:
      "Cicatrizes AQ1km cruzadas com classes AHP. Panorama estadual, municipal, sazonalidade, recorrência e IPA composto.",
    cor: "#EF4444",
    href: "/monitoramento/queimadas/dashboard",
    slidesAproximado: 8,
    icone: "🔥",
  },
  {
    id: "mapbiomas",
    nome: "Alertas MapBiomas",
    descricao:
      "IPI, composição fundiária (Autorizado/Parcial/Regularizado/Irregular), sazonalidade, comparativo desde 2022 e leitura CGEO+.",
    cor: "#F59E0B",
    href: "/monitoramento/mapbiomas/dashboard",
    slidesAproximado: 6,
    icone: "🌱",
  },
  {
    id: "prodes",
    nome: "PRODES Cerrado",
    descricao:
      "Validação cruzada MapBiomas × PRODES: concordância, vetores de pressão, cobertura, ranking municipal e comparativo.",
    cor: "#10B981",
    href: "/monitoramento/prodes/dashboard",
    slidesAproximado: 7,
    icone: "🛰️",
  },
  {
    id: "car",
    nome: "CAR — Regularização",
    descricao:
      "Passivo SICAR: análises pendentes, status de regularização e concentração municipal.",
    cor: "#8B5CF6",
    href: "/car",
    slidesAproximado: 4,
    icone: "🗺️",
  },
];

export function getModuloById(id: string): ApresentacaoModulo | undefined {
  return APRESENTACAO_MODULOS.find((m) => m.id === id);
}

/** Parseia a query string `?modulos=queimadas,mapbiomas,prodes` num array. */
export function parseRoteiro(param: string | null | undefined): ApresentacaoModulo[] {
  if (!param) return [];
  const ids = param
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: ApresentacaoModulo[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const m = getModuloById(id);
    if (m) out.push(m);
  }
  return out;
}
