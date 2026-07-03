import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parsePlanilha } from "@/lib/import/planilha-parser";

function makeXlsx(rows: unknown[][], sheetName = "JANEIRO"): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

const HEADER = ["DIA", "SISTEMA", "PROCESSO", "ANALISTA", "STATUS", "SETOR DE DESTINO", "OBS"];

describe("parsePlanilha", () => {
  it("processa aba mensal com linhas válidas", () => {
    const buf = makeXlsx([
      HEADER,
      ["2026-01-05", "SIGA", "CCAR.13427-9/2025", "Raylane", "Finalizado", "Concluido no setor", null],
    ]);
    const result = parsePlanilha(buf);
    expect(result.linhas).toHaveLength(1);
    expect(result.linhas[0].sistema).toBe("SIGA");
    expect(result.linhas[0].sicarFinalidade).toBeNull();
    expect(result.linhas[0].resultado).toBe("Finalizado");
  });

  it("normaliza SICAR-LANÇAMENTO em sistema + finalidade", () => {
    const buf = makeXlsx([
      HEADER,
      ["2026-07-01", "SICAR-LANÇAMENTO", "PI-2210003-FEEFE", "Dalila", "Finalizado", "SICAR", null],
    ]);
    const result = parsePlanilha(buf);
    expect(result.linhas[0].sistema).toBe("SICAR");
    expect(result.linhas[0].sicarFinalidade).toBe("Lancamento");
  });

  it("normaliza SICAR-ANALISE", () => {
    const buf = makeXlsx([
      HEADER,
      ["2026-03-02", "SICAR-ANALISE", "PI-2210656-CD18", "Marco", "Finalizado", "SICAR", null],
    ]);
    const result = parsePlanilha(buf);
    expect(result.linhas[0].sicarFinalidade).toBe("Analise");
  });

  it("normaliza Analisado com pendência (com acento)", () => {
    const buf = makeXlsx([
      HEADER,
      ["2026-02-03", "SEI", "00130.008773/2025-15", "Davi", "Analisado com pendência", "CGEO", null],
    ]);
    const result = parsePlanilha(buf);
    expect(result.linhas[0].resultado).toBe("Analisado com pendencia");
  });

  it("ignora abas PAINEL e GRÁFICOS", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADER]), "JANEIRO");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["x"]]), "PAINEL");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["y"]]), "GRÁFICOS");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const result = parsePlanilha(buf);
    expect(result.abasProcessadas).toContain("JANEIRO");
    expect(result.abasIgnoradas).toEqual(expect.arrayContaining(["PAINEL", "GRÁFICOS"]));
  });

  it("registra erro para data inválida", () => {
    const buf = makeXlsx([
      HEADER,
      [null, "SEI", "00130.001/2026", "Marco", "Finalizado", "CGEO", null],
    ]);
    const result = parsePlanilha(buf);
    expect(result.linhas).toHaveLength(0);
    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].problema).toContain("Data");
  });

  it("registra erro para sistema desconhecido", () => {
    const buf = makeXlsx([
      HEADER,
      ["2026-01-05", "SISTEMA-QUALQUER", "PROC-123", "Marco", "Finalizado", "CGEO", null],
    ]);
    const result = parsePlanilha(buf);
    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].problema).toContain("Sistema");
  });

  it("pula linhas totalmente vazias", () => {
    const buf = makeXlsx([
      HEADER,
      [null, null, null, null, null, null, null],
      ["2026-01-05", "SIGA", "CCAR.001/2026", "Marco", "Finalizado", "CGEO", null],
    ]);
    const result = parsePlanilha(buf);
    expect(result.linhas).toHaveLength(1);
    expect(result.erros).toHaveLength(0);
  });

  it("aceita data como serial Excel", () => {
    const buf = makeXlsx([
      HEADER,
      [46023, "SIGA", "PROC-001", "Marco", "Finalizado", "CGEO", null],
    ]);
    const result = parsePlanilha(buf);
    expect(result.linhas).toHaveLength(1);
    expect(result.linhas[0].dataAnalise).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
