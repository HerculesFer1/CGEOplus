import { describe, it, expect } from "vitest";
import { parseCarCsv, normalizeHeader } from "@/lib/car/parser";
import { CarParseError } from "@/lib/car/types";

const HEADER = "Número do Recibo;Município;Situação do Imóvel;Fase do Processo;";

/** Codifica string como buffer UTF-8 (o padrão nativo do TextEncoder). */
function utf8(s: string): Buffer {
  return Buffer.from(s, "utf8");
}

/** Codifica string como buffer "windows-1252" — os caracteres portugueses
 *  que usamos (á, é, í, ó, ú, ç, ã, õ, ê, ô) coincidem com latin-1, então
 *  `Buffer.from(s, 'latin1')` produz bytes CP1252 válidos para as fixtures. */
function cp1252(s: string): Buffer {
  return Buffer.from(s, "latin1");
}

describe("normalizeHeader", () => {
  it("remove acentos, colapsa espaços e minusculiza", () => {
    expect(normalizeHeader("  Município  ")).toBe("municipio");
    expect(normalizeHeader("Situação do Imóvel")).toBe("situacao do imovel");
    expect(normalizeHeader("Número\tdo   Recibo")).toBe("numero do recibo");
  });
});

describe("parseCarCsv — happy paths", () => {
  it("parseia CSV UTF-8 com as 4 colunas obrigatórias", () => {
    const csv = [
      HEADER,
      "PI-2211209-AAA;Uruçuí;Suspenso;Em análise;",
      "PI-2211209-BBB;Teresina;Ativo;Analisado, em conformidade com a Lei nº 12.651/2012;",
    ].join("\n");

    const result = parseCarCsv(utf8(csv));
    expect(result.encoding).toBe("utf-8");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      numeroRecibo: "PI-2211209-AAA",
      municipio: "Uruçuí",
      situacao: "Suspenso",
      faseOriginal: "Em análise",
      linha: 2,
    });
    expect(result.rows[1].situacao).toBe("Ativo");
  });

  it("parseia CSV CP1252 (formato bruto do SICAR)", () => {
    const csv = [
      HEADER,
      "PI-2211209-CCC;Uruçuí;Pendente;Analisado com pendências, aguardando retificação;",
    ].join("\r\n");

    const result = parseCarCsv(cp1252(csv));
    expect(result.encoding).toBe("windows-1252");
    expect(result.rows[0].municipio).toBe("Uruçuí");
    expect(result.rows[0].faseOriginal).toBe(
      "Analisado com pendências, aguardando retificação",
    );
  });

  it("descarta linhas vazias e conta em linhasDescartadas", () => {
    const csv = [
      HEADER,
      "PI-1;Teresina;Ativo;Em análise;",
      "",
      ";;;;",
      "PI-2;Parnaíba;Ativo;Em análise;",
    ].join("\n");

    const result = parseCarCsv(utf8(csv));
    expect(result.rows).toHaveLength(2);
    expect(result.linhasDescartadas).toBe(2);
  });

  it("aceita colunas em ordem invertida (mapeia por nome)", () => {
    const csv = [
      "Fase do Processo;Situação do Imóvel;Município;Número do Recibo",
      "Em análise;Ativo;Teresina;PI-XYZ",
    ].join("\n");

    const result = parseCarCsv(utf8(csv));
    expect(result.rows[0]).toMatchObject({
      numeroRecibo: "PI-XYZ",
      municipio: "Teresina",
      situacao: "Ativo",
      faseOriginal: "Em análise",
    });
  });

  it("aceita cabeçalho sem acento (Municipio, Situacao)", () => {
    const csv = [
      "Numero do Recibo;Municipio;Situacao do Imovel;Fase do Processo",
      "PI-ABC;Teresina;Ativo;Em análise",
    ].join("\n");
    const result = parseCarCsv(utf8(csv));
    expect(result.rows).toHaveLength(1);
  });
});

describe("parseCarCsv — pré-flight bloqueante", () => {
  it("lança MISSING_COLUMN quando Município está ausente", () => {
    const csv = [
      "Número do Recibo;Situação do Imóvel;Fase do Processo",
      "PI-1;Ativo;Em análise",
    ].join("\n");

    expect(() => parseCarCsv(utf8(csv))).toThrowError(CarParseError);
    try {
      parseCarCsv(utf8(csv));
    } catch (e) {
      expect(e).toBeInstanceOf(CarParseError);
      const err = e as CarParseError;
      expect(err.code).toBe("MISSING_COLUMN");
      expect(err.message).toContain("Município");
    }
  });

  it("lista TODAS as colunas ausentes numa única mensagem", () => {
    const csv = "Número do Recibo\nPI-1\n";
    try {
      parseCarCsv(utf8(csv));
      throw new Error("deveria ter lançado");
    } catch (e) {
      const err = e as CarParseError;
      expect(err.code).toBe("MISSING_COLUMN");
      expect(err.message).toMatch(/Município/);
      expect(err.message).toMatch(/Situação do Imóvel/);
      expect(err.message).toMatch(/Fase do Processo/);
    }
  });

  it("lança EMPTY_FILE para buffer vazio", () => {
    expect(() => parseCarCsv(Buffer.alloc(0))).toThrowError(/vazio/i);
  });

  it("lança INVALID_SITUACAO para situação desconhecida", () => {
    const csv = [
      HEADER,
      "PI-1;Teresina;NOVA_SITUACAO_INEXISTENTE;Em análise;",
    ].join("\n");
    try {
      parseCarCsv(utf8(csv));
      throw new Error("deveria ter lançado");
    } catch (e) {
      const err = e as CarParseError;
      expect(err.code).toBe("INVALID_SITUACAO");
      expect(err.details).toMatchObject({
        linha: 2,
        situacaoRecebida: "NOVA_SITUACAO_INEXISTENTE",
      });
    }
  });
});
