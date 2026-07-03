/**
 * Servidores — Service Layer
 *
 * Regras de negócio isoladas. Usa repositório abstrato (in-memory ou Drizzle)
 * para permitir desenvolvimento local sem DB e testes unitários rápidos.
 */

import { randomUUID } from "node:crypto";

import {
  servidorCreateSchema,
  servidorUpdateSchema,
  type ServidorCreateInput,
  type ServidorUpdateInput,
} from "@/lib/validators/servidor";

export type Servidor = ServidorCreateInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export interface ServidorRepository {
  list(): Promise<Servidor[]>;
  findById(id: string): Promise<Servidor | null>;
  findByEmail(email: string): Promise<Servidor | null>;
  insert(data: Omit<Servidor, "createdAt" | "updatedAt">): Promise<Servidor>;
  update(id: string, patch: Partial<Servidor>): Promise<Servidor>;
  delete(id: string): Promise<void>;
}

export class ServidorEmailInUseError extends Error {
  constructor(email: string) {
    super(`E-mail já cadastrado: ${email}`);
    this.name = "ServidorEmailInUseError";
  }
}

export class ServidorNotFoundError extends Error {
  constructor(id: string) {
    super(`Servidor não encontrado: ${id}`);
    this.name = "ServidorNotFoundError";
  }
}

export class ServidoresService {
  constructor(private readonly repo: ServidorRepository) {}

  async list() {
    return this.repo.list();
  }

  async get(id: string) {
    const s = await this.repo.findById(id);
    if (!s) throw new ServidorNotFoundError(id);
    return s;
  }

  async create(input: ServidorCreateInput): Promise<Servidor> {
    const parsed = servidorCreateSchema.parse(input);

    const existing = await this.repo.findByEmail(parsed.email);
    if (existing) throw new ServidorEmailInUseError(parsed.email);

    return this.repo.insert({
      id: randomUUID(),
      ...parsed,
      matricula: parsed.matricula || undefined,
      especialidade: parsed.especialidade || undefined,
    });
  }

  async update(input: ServidorUpdateInput): Promise<Servidor> {
    const parsed = servidorUpdateSchema.parse(input);
    const current = await this.get(parsed.id);

    if (parsed.email && parsed.email !== current.email) {
      const existing = await this.repo.findByEmail(parsed.email);
      if (existing && existing.id !== current.id) {
        throw new ServidorEmailInUseError(parsed.email);
      }
    }

    const { id, ...patch } = parsed;
    return this.repo.update(id, patch);
  }

  async delete(id: string): Promise<void> {
    await this.get(id); // 404 se não existir
    return this.repo.delete(id);
  }
}
