import { describe, it, expect } from "vitest";
import {
  processoCreateSchema,
  analiseFromPlanilhaSchema,
} from "@/lib/validators/processo";

describe("processoCreateSchema", () => {
  const baseSEI = {
    numero: "00130.008773/2025-15",
    sistema: "SEI" as const,
    dataEntrada: "2026-02-03",
  };

  it("aceita SEI sem finalidade", () => {
    const parsed = processoCreateSchema.parse(baseSEI);
    expect(parsed.numero).toBe("00130.008773/2025-15");
  });

  it("aceita SICAR com finalidade", () => {
    const parsed = processoCreateSchema.parse({
      numero: "PI-2210656-96E69",
      sistema: "SICAR",
      sicarFinalidade: "Analise",
      dataEntrada: "2026-03-02",
    });
    expect(parsed.sicarFinalidade).toBe("Analise");
  });

  it("rejeita SICAR sem finalidade", () => {
    expect(() =>
      processoCreateSchema.parse({
        numero: "PI-2210656",
        sistema: "SICAR",
        dataEntrada: "2026-03-02",
      }),
    ).toThrow();
  });

  it("rejeita SEI com finalidade", () => {
    expect(() =>
      processoCreateSchema.parse({
        ...baseSEI,
        sicarFinalidade: "Lancamento",
      }),
    ).toThrow();
  });

  it("rejeita data em formato inválido", () => {
    expect(() =>
      processoCreateSchema.parse({ ...baseSEI, dataEntrada: "01/02/2026" }),
    ).toThrow();
  });
});

describe("analiseFromPlanilhaSchema", () => {
  const valid = {
    numeroProcesso: "CCAR.13427-9/2025",
    sistema: "SIGA" as const,
    servidorId: "11111111-1111-4111-8111-111111111111",
    dataAnalise: "2026-01-05",
    resultado: "Finalizado" as const,
  };

  it("aceita entrada mínima válida", () => {
    const parsed = analiseFromPlanilhaSchema.parse(valid);
    expect(parsed.resultado).toBe("Finalizado");
  });

  it("aceita SICAR-Lancamento", () => {
    const parsed = analiseFromPlanilhaSchema.parse({
      ...valid,
      sistema: "SICAR",
      sicarFinalidade: "Lancamento",
      numeroProcesso: "PI-2210003-FEEFE",
    });
    expect(parsed.sicarFinalidade).toBe("Lancamento");
  });

  it("rejeita servidorId não-UUID", () => {
    expect(() =>
      analiseFromPlanilhaSchema.parse({ ...valid, servidorId: "not-a-uuid" }),
    ).toThrow();
  });
});
