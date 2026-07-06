/**
 * Repositório in-memory de Servidores.
 * Usado quando DATABASE_URL não está configurada — permite explorar UI
 * durante o setup e alimenta os testes unitários.
 * Persiste em globalThis para sobreviver a hot-reload durante dev.
 */

import type { Servidor, ServidorRepository } from "@/lib/services/servidores.service";

// 13 servidores iniciais + Dalila — espelha o seed do banco.
const INITIAL: Omit<Servidor, "createdAt" | "updatedAt">[] = [
  { id: "11111111-1111-1111-1111-000000000001", nome: "Aline Lima",       apelido: "Aline",    email: "aline@semarh.gov.br",     cargo: "Auditora Fiscal Ambiental / Gestora",         tipoVinculo: "Efetivo",   dataIngresso: "2025-06-01", status: "ativo", nucleoPrincipal: "Gerência" },
  { id: "11111111-1111-1111-1111-000000000002", nome: "Allan Pitterson",  apelido: "Allan",    email: "allan@semarh.gov.br",     cargo: "Tecnólogo/Analista de Geoprocessamento",       tipoVinculo: "Efetivo",   dataIngresso: "2023-10-01", status: "ativo", nucleoPrincipal: "Licenciamento" },
  { id: "11111111-1111-1111-1111-000000000003", nome: "Davi Monteiro",    apelido: "Davi",     email: "davi@semarh.gov.br",      cargo: "Consultor Pilares/Esp. Geoprocessamento",      tipoVinculo: "Consultor Pilares II", dataIngresso: "2023-09-01", status: "ativo", nucleoPrincipal: "Licenciamento" },
  { id: "11111111-1111-1111-1111-000000000004", nome: "Emilio Daniel",    apelido: "Emílio",   email: "emilio@semarh.gov.br",    cargo: "Tecnólogo/Analista de Geoprocessamento",       tipoVinculo: "Efetivo",   dataIngresso: "2024-11-01", status: "ativo", nucleoPrincipal: "Licenciamento" },
  { id: "11111111-1111-1111-1111-000000000005", nome: "Hercules Maciel",  apelido: "Hércules", email: "hercules@semarh.gov.br",  cargo: "Consultor Pilares/Esp. Geoprocessamento",      tipoVinculo: "Consultor Pilares II", dataIngresso: "2026-03-01", status: "ativo", nucleoPrincipal: "Licenciamento" },
  { id: "11111111-1111-1111-1111-000000000006", nome: "Italo Phelipe",    apelido: "Italo",    email: "italo@semarh.gov.br",     cargo: "Consultor Pilares/Esp. Geoprocessamento",      tipoVinculo: "Consultor Pilares II", dataIngresso: "2019-07-01", status: "ativo", nucleoPrincipal: "Licenciamento" },
  { id: "11111111-1111-1111-1111-000000000007", nome: "Jose Eudes",       apelido: "Eudes",    email: "eudes@semarh.gov.br",     cargo: "Consultor PSI/Esp. Eng. Agronômica",           tipoVinculo: "Consultor PSI", dataIngresso: "2025-11-01", status: "ativo", nucleoPrincipal: "CAR" },
  { id: "11111111-1111-1111-1111-000000000008", nome: "Marco Aurelio",    apelido: "Marco",    email: "marco@semarh.gov.br",     cargo: "Consultor PSI/Esp. Geoprocessamento",          tipoVinculo: "Consultor PSI", dataIngresso: "2015-09-01", status: "ativo", nucleoPrincipal: "CAR" },
  { id: "11111111-1111-1111-1111-000000000009", nome: "Maria Tereza",     apelido: "Tereza",   email: "tereza@semarh.gov.br",    cargo: "Consultora PSI/Esp. Geoprocessamento",         tipoVinculo: "Consultor PSI", dataIngresso: "2016-10-01", status: "ativo", nucleoPrincipal: "CAR" },
  { id: "11111111-1111-1111-1111-000000000010", nome: "Milena Kamila",    apelido: "Kamila",   email: "kamila@semarh.gov.br",    cargo: "Consultora PSI/Esp. Geoprocessamento",         tipoVinculo: "Consultor PSI", dataIngresso: "2023-09-01", status: "ativo", nucleoPrincipal: "Fiscalização" },
  { id: "11111111-1111-1111-1111-000000000011", nome: "Natanael de Araujo", apelido: "Natanael", email: "natanael@semarh.gov.br", cargo: "Consultor PSI/Esp. Geoprocessamento",         tipoVinculo: "Consultor PSI", dataIngresso: "2016-10-01", status: "ativo", nucleoPrincipal: "Fiscalização" },
  { id: "11111111-1111-1111-1111-000000000012", nome: "Raylane Rodrigues", apelido: "Raylane", email: "raylane@semarh.gov.br",   cargo: "Consultora PSI/Esp. Geoprocessamento",         tipoVinculo: "Consultor PSI", dataIngresso: "2023-11-01", status: "ativo", nucleoPrincipal: "CAR" },
  { id: "11111111-1111-1111-1111-000000000013", nome: "Suyanny Soleani",  apelido: "Suyanny",  email: "suyanny@semarh.gov.br",   cargo: "Auxiliar Administrativa",                       tipoVinculo: "Suporte",   dataIngresso: "2024-01-01", status: "ativo", nucleoPrincipal: "Administrativo" },
  { id: "11111111-1111-1111-1111-000000000014", nome: "Dalila",           apelido: "Dalila",   email: "dalila@semarh.gov.br",    cargo: "Consultora PSI/Esp. Geoprocessamento",         tipoVinculo: "Consultor PSI", dataIngresso: "2026-07-01", status: "ativo", nucleoPrincipal: "CAR" },
];

type Store = Map<string, Servidor>;

// Persiste no globalThis para sobreviver a hot-reload
const g = globalThis as unknown as { __CGEO_SERVIDORES__?: Store };

function getStore(): Store {
  if (!g.__CGEO_SERVIDORES__) {
    const now = new Date().toISOString();
    g.__CGEO_SERVIDORES__ = new Map(
      INITIAL.map((s) => [s.id, { ...s, createdAt: now, updatedAt: now }]),
    );
  }
  return g.__CGEO_SERVIDORES__;
}

export class InMemoryServidorRepository implements ServidorRepository {
  async list(): Promise<Servidor[]> {
    return Array.from(getStore().values()).sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    );
  }

  async findById(id: string): Promise<Servidor | null> {
    return getStore().get(id) ?? null;
  }

  async findByEmail(email: string): Promise<Servidor | null> {
    const target = email.trim().toLowerCase();
    for (const s of getStore().values()) {
      if (s.email.toLowerCase() === target) return s;
    }
    return null;
  }

  async insert(data: Omit<Servidor, "createdAt" | "updatedAt">): Promise<Servidor> {
    const now = new Date().toISOString();
    const record: Servidor = { ...data, createdAt: now, updatedAt: now };
    getStore().set(record.id, record);
    return record;
  }

  async update(id: string, patch: Partial<Servidor>): Promise<Servidor> {
    const current = getStore().get(id);
    if (!current) throw new Error(`Servidor ${id} not found`);
    const updated: Servidor = {
      ...current,
      ...patch,
      id: current.id,
      updatedAt: new Date().toISOString(),
    };
    getStore().set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    getStore().delete(id);
  }
}
