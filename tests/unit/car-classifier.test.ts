import { describe, it, expect } from "vitest";
import { classifyRows, applyManualResolutions } from "@/lib/car/classifier";
import type { CarBucket, ParsedCarRow } from "@/lib/car/types";

function row(
  faseOriginal: string,
  overrides: Partial<ParsedCarRow> = {},
): ParsedCarRow {
  return {
    numeroRecibo: overrides.numeroRecibo ?? `PI-${Math.random().toString(36).slice(2, 8)}`,
    municipio: overrides.municipio ?? "Teresina",
    situacao: overrides.situacao ?? "Ativo",
    faseOriginal,
    linha: overrides.linha ?? 2,
  };
}

const MAPA_COMPLETO = new Map<string, CarBucket>([
  ["Em análise", "AG_GESTOR"],
  ["Analisado, em conformidade com a Lei nº 12.651/2012", "VALIDADO"],
  ["Cancelado por decisão judicial", "CANCELADO"],
  [
    "Analisado com pendências, aguardando retificação",
    "PENDENTE",
  ],
  ["Análise da Secretaria", "SUSPENSO"],
]);

describe("classifyRows — mapeamento", () => {
  it("aplica o mapa e agrega totais por bucket", () => {
    const rows = [
      row("Em análise"),
      row("Em análise"),
      row("Analisado, em conformidade com a Lei nº 12.651/2012"),
      row("Cancelado por decisão judicial"),
    ];
    const { classified, preview } = classifyRows(rows, MAPA_COMPLETO);

    expect(classified.map((r) => r.bucket)).toEqual([
      "AG_GESTOR",
      "AG_GESTOR",
      "VALIDADO",
      "CANCELADO",
    ]);
    expect(preview.totalRegistros).toBe(4);
    expect(preview.totalPorBucket.AG_GESTOR).toBe(2);
    expect(preview.totalPorBucket.VALIDADO).toBe(1);
    expect(preview.totalPorBucket.CANCELADO).toBe(1);
    expect(preview.totalPorBucket.NAO_CLASSIFICADO).toBe(0);
  });

  it("fase ausente do mapa vai para NAO_CLASSIFICADO", () => {
    const rows = [
      row("Em análise"),
      row("Fase Nova Desconhecida do SICAR"),
      row("Fase Nova Desconhecida do SICAR"),
    ];
    const { preview } = classifyRows(rows, MAPA_COMPLETO);

    expect(preview.totalPorBucket.NAO_CLASSIFICADO).toBe(2);
    expect(preview.fasesNaoClassificadas).toEqual([
      { fase: "Fase Nova Desconhecida do SICAR", count: 2 },
    ]);
    // Reconhecidas não devem incluir a fase nova
    expect(
      preview.fasesReconhecidas.find(
        (f) => f.fase === "Fase Nova Desconhecida do SICAR",
      ),
    ).toBeUndefined();
  });

  it("fases reconhecidas e novas são ordenadas por count desc", () => {
    const rows: ParsedCarRow[] = [];
    // 3 conformidade, 1 em análise
    for (let i = 0; i < 3; i++)
      rows.push(row("Analisado, em conformidade com a Lei nº 12.651/2012"));
    rows.push(row("Em análise"));
    // 5 e 2 de fases novas
    for (let i = 0; i < 5; i++) rows.push(row("Fase Nova A"));
    for (let i = 0; i < 2; i++) rows.push(row("Fase Nova B"));

    const { preview } = classifyRows(rows, MAPA_COMPLETO);
    expect(preview.fasesReconhecidas[0].fase).toBe(
      "Analisado, em conformidade com a Lei nº 12.651/2012",
    );
    expect(preview.fasesReconhecidas[0].count).toBe(3);
    expect(preview.fasesReconhecidas[1].count).toBe(1);
    expect(preview.fasesNaoClassificadas[0]).toEqual({
      fase: "Fase Nova A",
      count: 5,
    });
    expect(preview.fasesNaoClassificadas[1].count).toBe(2);
  });

  it("agrega por município ordenado por total desc", () => {
    const rows = [
      row("Em análise", { municipio: "Teresina" }),
      row("Em análise", { municipio: "Teresina" }),
      row("Em análise", { municipio: "Teresina" }),
      row("Em análise", { municipio: "Parnaíba" }),
      row("Cancelado por decisão judicial", { municipio: "Parnaíba" }),
    ];
    const { preview } = classifyRows(rows, MAPA_COMPLETO);

    expect(preview.porMunicipio[0]).toMatchObject({
      municipio: "Teresina",
      total: 3,
    });
    expect(preview.porMunicipio[0].porBucket.AG_GESTOR).toBe(3);
    expect(preview.porMunicipio[1]).toMatchObject({
      municipio: "Parnaíba",
      total: 2,
    });
    expect(preview.porMunicipio[1].porBucket.AG_GESTOR).toBe(1);
    expect(preview.porMunicipio[1].porBucket.CANCELADO).toBe(1);
  });

  it("agrega por situação", () => {
    const rows = [
      row("Em análise", { situacao: "Ativo" }),
      row("Em análise", { situacao: "Ativo" }),
      row("Análise da Secretaria", { situacao: "Suspenso" }),
      row("Cancelado por decisão judicial", { situacao: "Cancelado" }),
    ];
    const { preview } = classifyRows(rows, MAPA_COMPLETO);
    expect(preview.totalPorSituacao.Ativo).toBe(2);
    expect(preview.totalPorSituacao.Suspenso).toBe(1);
    expect(preview.totalPorSituacao.Cancelado).toBe(1);
    expect(preview.totalPorSituacao.Pendente).toBe(0);
    expect(preview.totalPorSituacao.Retificado).toBe(0);
  });
});

describe("applyManualResolutions", () => {
  it("só reatribui linhas NAO_CLASSIFICADO, preserva reconhecidas", () => {
    const rows = [
      row("Em análise"),
      row("Fase Nova A"),
      row("Fase Nova A"),
      row("Fase Nova B"),
    ];
    const inicial = classifyRows(rows, MAPA_COMPLETO);
    expect(inicial.preview.totalPorBucket.NAO_CLASSIFICADO).toBe(3);

    const resolvido = applyManualResolutions(
      inicial,
      new Map([
        ["Fase Nova A", "PENDENTE" as CarBucket],
        ["Fase Nova B", "AG_GESTOR" as CarBucket],
      ]),
    );

    expect(resolvido.preview.totalPorBucket.NAO_CLASSIFICADO).toBe(0);
    expect(resolvido.preview.totalPorBucket.PENDENTE).toBe(2);
    expect(resolvido.preview.totalPorBucket.AG_GESTOR).toBe(2);
    // Linha originalmente reconhecida ("Em análise") permanece AG_GESTOR
    expect(resolvido.classified[0].bucket).toBe("AG_GESTOR");
  });

  it("resolutions vazias retornam o mesmo resultado", () => {
    const rows = [row("Em análise"), row("Fase Nova")];
    const inicial = classifyRows(rows, MAPA_COMPLETO);
    const igual = applyManualResolutions(inicial, new Map());
    expect(igual).toBe(inicial); // mesma referência (short-circuit)
  });
});
