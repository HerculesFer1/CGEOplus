import { describe, expect, it } from "vitest";

import { computeIpaScore } from "@/lib/monit-ext/ipa-score";
import { anoRecenteCompleto, IPA_PESOS } from "@/lib/monit-ext/constants";

/**
 * Cobertura do núcleo do módulo Monitoramento Externo: o índice composto IPA
 * (renormalização de pesos, conversão concordância→divergência, arredondamento)
 * e a heurística de "ano recente completo" que dita o ano-default dos dashboards.
 */

describe("computeIpaScore", () => {
  it("combina as 3 fontes com os pesos nominais (50/30/20)", () => {
    // ipi=100, prio=100, concordancia=0 → divProdes=100. Todas presentes,
    // soma de pesos = 1, então o IPA é a média ponderada direta = 100.
    const s = computeIpaScore({ ipi: 100, prioridade: 100, concordancia: 0 });
    expect(s.ipa).toBe(100);
    expect(s.parcIpi).toBe(100);
    expect(s.parcQueimadas).toBe(100);
    expect(s.parcProdes).toBe(100);
  });

  it("converte concordância em divergência (100 − concordância)", () => {
    const s = computeIpaScore({ ipi: null, prioridade: null, concordancia: 70 });
    expect(s.parcProdes).toBe(30);
    // única fonte presente → domina 100% do score renormalizado
    expect(s.ipa).toBe(30);
  });

  it("faz clamp da divergência em 0 quando concordância > 100", () => {
    const s = computeIpaScore({ ipi: null, prioridade: null, concordancia: 130 });
    expect(s.parcProdes).toBe(0);
  });

  it("renormaliza os pesos quando falta uma fonte (não trata ausência como zero)", () => {
    // Só IPI e prioridade presentes. Pesos 0.5 e 0.3 → renormalizados para
    // 0.5/0.8 e 0.3/0.8. ipi=80, prio=40 → 0.625*80 + 0.375*40 = 65.
    const s = computeIpaScore({ ipi: 80, prioridade: 40, concordancia: null });
    expect(s.parcProdes).toBeNull();
    expect(s.ipa).toBe(65);
  });

  it("com uma única fonte, o score é o valor dela (peso renormaliza para 1)", () => {
    const s = computeIpaScore({ ipi: 42, prioridade: null, concordancia: null });
    expect(s.ipa).toBe(42);
  });

  it("retorna 0 quando nenhuma fonte tem cobertura", () => {
    const s = computeIpaScore({ ipi: null, prioridade: null, concordancia: null });
    expect(s.ipa).toBe(0);
    expect(s.parcIpi).toBeNull();
    expect(s.parcQueimadas).toBeNull();
    expect(s.parcProdes).toBeNull();
  });

  it("arredonda o IPA para 1 casa decimal", () => {
    // ipi=33.33, prio=33.33, div=33.34 → ~33.333 → 33.3
    const s = computeIpaScore({ ipi: 33.33, prioridade: 33.33, concordancia: 66.66 });
    expect(s.ipa).toBeCloseTo(33.3, 5);
    expect(Number.isInteger(s.ipa * 10)).toBe(true);
  });

  it("mantém os pesos coerentes com a constante IPA_PESOS (soma 1.0)", () => {
    const soma =
      IPA_PESOS.ipi + IPA_PESOS.fogoEmPrioritaria + IPA_PESOS.divergenciaProdes;
    expect(soma).toBeCloseTo(1, 10);
  });
});

describe("anoRecenteCompleto", () => {
  it("em jan/fev retorna ano-2 (mês N publicado só no início de N+1)", () => {
    expect(anoRecenteCompleto(new Date("2026-01-15T12:00:00Z"))).toBe(2024);
    expect(anoRecenteCompleto(new Date("2026-02-28T12:00:00Z"))).toBe(2024);
  });

  it("a partir de março retorna ano-1", () => {
    expect(anoRecenteCompleto(new Date("2026-03-01T12:00:00Z"))).toBe(2025);
    expect(anoRecenteCompleto(new Date("2026-07-17T12:00:00Z"))).toBe(2025);
    expect(anoRecenteCompleto(new Date("2026-12-31T12:00:00Z"))).toBe(2025);
  });
});
