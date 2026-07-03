import { describe, it, expect } from "vitest";
import { servidorCreateSchema } from "@/lib/validators/servidor";

describe("servidorCreateSchema", () => {
  const valid = {
    nome: "Marco Aurélio",
    apelido: "Marco",
    email: "MARCO@semarh.gov.br",
    matricula: "",
    cargo: "Consultor PSI/Esp. Geoprocessamento",
    tipoVinculo: "Consultor" as const,
    especialidade: "",
    dataIngresso: "2015-09-01",
    status: "ativo" as const,
    nucleoPrincipal: "CAR" as const,
  };

  it("aceita entrada válida", () => {
    const parsed = servidorCreateSchema.parse(valid);
    expect(parsed.nome).toBe("Marco Aurélio");
  });

  it("normaliza e-mail para minúsculas", () => {
    const parsed = servidorCreateSchema.parse(valid);
    expect(parsed.email).toBe("marco@semarh.gov.br");
  });

  it("rejeita nome curto", () => {
    expect(() =>
      servidorCreateSchema.parse({ ...valid, nome: "Al" }),
    ).toThrow();
  });

  it("rejeita e-mail inválido", () => {
    expect(() =>
      servidorCreateSchema.parse({ ...valid, email: "não-é-email" }),
    ).toThrow();
  });

  it("rejeita data em formato incorreto", () => {
    expect(() =>
      servidorCreateSchema.parse({ ...valid, dataIngresso: "01/09/2015" }),
    ).toThrow();
  });

  it("rejeita vínculo fora do enum", () => {
    expect(() =>
      servidorCreateSchema.parse({
        ...valid,
        tipoVinculo: "Terceirizado" as unknown as typeof valid.tipoVinculo,
      }),
    ).toThrow();
  });

  it("aceita campos opcionais vazios", () => {
    const parsed = servidorCreateSchema.parse({
      ...valid,
      matricula: "",
      especialidade: "",
    });
    expect(parsed.matricula).toBe("");
    expect(parsed.especialidade).toBe("");
  });
});
