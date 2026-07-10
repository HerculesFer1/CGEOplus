import { describe, it, expect, beforeEach } from "vitest";
import {
  ServidoresService,
  ServidorEmailInUseError,
  ServidorNotFoundError,
  type ServidorRepository,
  type Servidor,
} from "@/lib/services/servidores.service";
import type { ServidorCreateInput } from "@/lib/validators/servidor";

const now = () => new Date().toISOString();

class FakeRepo implements ServidorRepository {
  store = new Map<string, Servidor>();

  async list() {
    return Array.from(this.store.values());
  }
  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async findByEmail(email: string) {
    const t = email.toLowerCase();
    for (const s of this.store.values()) {
      if (s.email.toLowerCase() === t) return s;
    }
    return null;
  }
  async insert(data: Omit<Servidor, "createdAt" | "updatedAt">) {
    const s: Servidor = { ...data, createdAt: now(), updatedAt: now() };
    this.store.set(s.id, s);
    return s;
  }
  async update(id: string, patch: Partial<Servidor>) {
    const cur = this.store.get(id)!;
    const upd = { ...cur, ...patch, id, updatedAt: now() };
    this.store.set(id, upd);
    return upd;
  }
  async delete(id: string) {
    this.store.delete(id);
  }
}

const validInput: ServidorCreateInput = {
  nome: "Marco Aurélio",
  apelido: "Marco",
  email: "marco@semarh.gov.br",
  cargo: "Consultor PSI",
  tipoVinculo: "Consultor PSI",
  dataIngresso: "2015-09-01",
  status: "ativo",
  nucleoPrincipal: "CAR",
};

describe("ServidoresService", () => {
  let repo: FakeRepo;
  let svc: ServidoresService;

  beforeEach(() => {
    repo = new FakeRepo();
    svc = new ServidoresService(repo);
  });

  describe("create", () => {
    it("cria servidor com ID gerado", async () => {
      const created = await svc.create(validInput);
      expect(created.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(created.nome).toBe("Marco Aurélio");
    });

    it("rejeita e-mail duplicado", async () => {
      await svc.create(validInput);
      await expect(svc.create(validInput)).rejects.toBeInstanceOf(
        ServidorEmailInUseError,
      );
    });

    it("valida entrada com Zod", async () => {
      await expect(
        svc.create({ ...validInput, email: "bad-email" }),
      ).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("atualiza campos parcialmente", async () => {
      const created = await svc.create(validInput);
      const updated = await svc.update({
        id: created.id,
        cargo: "Coordenador Técnico",
      });
      expect(updated.cargo).toBe("Coordenador Técnico");
      expect(updated.nome).toBe("Marco Aurélio");
    });

    it("permite manter o mesmo e-mail", async () => {
      const created = await svc.create(validInput);
      const updated = await svc.update({
        id: created.id,
        email: created.email,
      });
      expect(updated.email).toBe(created.email);
    });

    it("bloqueia troca para e-mail já usado por outro", async () => {
      const a = await svc.create(validInput);
      await svc.create({
        ...validInput,
        email: "tereza@semarh.gov.br",
        apelido: "Tereza",
        nome: "Maria Tereza",
      });
      await expect(
        svc.update({ id: a.id, email: "tereza@semarh.gov.br" }),
      ).rejects.toBeInstanceOf(ServidorEmailInUseError);
    });

    it("lança NotFound para ID inexistente", async () => {
      await expect(
        svc.update({
          id: "11111111-1111-4111-8111-111111111111",
          cargo: "Cargo Novo",
        }),
      ).rejects.toBeInstanceOf(ServidorNotFoundError);
    });
  });

  describe("delete", () => {
    it("remove existente", async () => {
      const created = await svc.create(validInput);
      await svc.delete(created.id);
      expect(await repo.findById(created.id)).toBeNull();
    });

    it("lança NotFound para ID inexistente", async () => {
      await expect(
        svc.delete("11111111-1111-4111-8111-111111111111"),
      ).rejects.toBeInstanceOf(ServidorNotFoundError);
    });
  });

  describe("list", () => {
    it("retorna vazio quando sem dados", async () => {
      expect(await svc.list()).toEqual([]);
    });

    it("retorna todos os inseridos", async () => {
      await svc.create(validInput);
      await svc.create({
        ...validInput,
        email: "tereza@semarh.gov.br",
        apelido: "Tereza",
        nome: "Maria Tereza",
      });
      expect((await svc.list()).length).toBe(2);
    });
  });
});
