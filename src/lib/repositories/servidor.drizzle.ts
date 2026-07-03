/**
 * Repositório Drizzle de Servidores — implementa a mesma interface
 * `ServidorRepository`, permitindo troca transparente com o in-memory.
 *
 * Carrega o núcleo principal via join com servidor_nucleo (where is_principal
 * = true AND data_fim IS NULL).
 */

import { and, eq, isNull, sql as dsql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { servidores, nucleos, servidorNucleo } from "@/lib/db/schema";
import type {
  Servidor,
  ServidorRepository,
} from "@/lib/services/servidores.service";

// Cache de núcleos (id ↔ nome) — carregado sob demanda
let nucleoNameCache: Map<string, string> | null = null;
let nucleoIdCache: Map<string, string> | null = null;

async function loadNucleoCaches() {
  if (nucleoNameCache && nucleoIdCache) return;
  const rows = await db.select({ id: nucleos.id, nome: nucleos.nome }).from(nucleos);
  nucleoNameCache = new Map(rows.map((r) => [r.id, r.nome]));
  nucleoIdCache = new Map(rows.map((r) => [r.nome, r.id]));
}

function invalidateNucleoCaches() {
  nucleoNameCache = null;
  nucleoIdCache = null;
}

async function nucleoIdByName(name: string): Promise<string> {
  await loadNucleoCaches();
  const id = nucleoIdCache!.get(name);
  if (!id) {
    invalidateNucleoCaches();
    await loadNucleoCaches();
    const retry = nucleoIdCache!.get(name);
    if (!retry) throw new Error(`Núcleo "${name}" não encontrado`);
    return retry;
  }
  return id;
}

async function nucleoNameById(id: string): Promise<string> {
  await loadNucleoCaches();
  return nucleoNameCache!.get(id) ?? "Coordenacao";
}

/** Serializa row do banco no shape do domínio (Servidor). */
async function toServidor(row: {
  id: string;
  nome: string;
  apelido: string | null;
  matricula: string | null;
  email: string;
  cargo: string;
  tipoVinculo: "Efetivo" | "Consultor" | "Suporte";
  especialidade: string | null;
  dataIngresso: string;
  status: "ativo" | "inativo" | "afastado";
  createdAt: Date;
  updatedAt: Date;
  nucleoPrincipalId: string | null;
}): Promise<Servidor> {
  const nucleoNome = row.nucleoPrincipalId
    ? await nucleoNameById(row.nucleoPrincipalId)
    : "Coordenacao";

  return {
    id: row.id,
    nome: row.nome,
    apelido: row.apelido ?? "",
    matricula: row.matricula ?? "",
    email: row.email,
    cargo: row.cargo,
    tipoVinculo: row.tipoVinculo,
    especialidade: row.especialidade ?? "",
    dataIngresso: row.dataIngresso,
    status: row.status,
    nucleoPrincipal: nucleoNome as Servidor["nucleoPrincipal"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Query builder padrão para servidor + núcleo principal ativo. */
function selectServidorFields() {
  return {
    id: servidores.id,
    nome: servidores.nome,
    apelido: servidores.apelido,
    matricula: servidores.matricula,
    email: servidores.email,
    cargo: servidores.cargo,
    tipoVinculo: servidores.tipoVinculo,
    especialidade: servidores.especialidade,
    dataIngresso: servidores.dataIngresso,
    status: servidores.status,
    createdAt: servidores.createdAt,
    updatedAt: servidores.updatedAt,
    nucleoPrincipalId: servidorNucleo.nucleoId,
  };
}

export class DrizzleServidorRepository implements ServidorRepository {
  async list(): Promise<Servidor[]> {
    const rows = await db
      .select(selectServidorFields())
      .from(servidores)
      .leftJoin(
        servidorNucleo,
        and(
          eq(servidorNucleo.servidorId, servidores.id),
          eq(servidorNucleo.isPrincipal, true),
          isNull(servidorNucleo.dataFim),
        ),
      )
      .orderBy(servidores.nome);

    return Promise.all(rows.map(toServidor));
  }

  async findById(id: string): Promise<Servidor | null> {
    const rows = await db
      .select(selectServidorFields())
      .from(servidores)
      .leftJoin(
        servidorNucleo,
        and(
          eq(servidorNucleo.servidorId, servidores.id),
          eq(servidorNucleo.isPrincipal, true),
          isNull(servidorNucleo.dataFim),
        ),
      )
      .where(eq(servidores.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return toServidor(rows[0]);
  }

  async findByEmail(email: string): Promise<Servidor | null> {
    const rows = await db
      .select(selectServidorFields())
      .from(servidores)
      .leftJoin(
        servidorNucleo,
        and(
          eq(servidorNucleo.servidorId, servidores.id),
          eq(servidorNucleo.isPrincipal, true),
          isNull(servidorNucleo.dataFim),
        ),
      )
      .where(eq(servidores.email, email.trim().toLowerCase()))
      .limit(1);

    if (rows.length === 0) return null;
    return toServidor(rows[0]);
  }

  async insert(data: Omit<Servidor, "createdAt" | "updatedAt">): Promise<Servidor> {
    const nucleoId = await nucleoIdByName(data.nucleoPrincipal);

    const [inserted] = await db
      .insert(servidores)
      .values({
        id: data.id,
        nome: data.nome,
        apelido: data.apelido,
        matricula: data.matricula || null,
        email: data.email,
        cargo: data.cargo,
        tipoVinculo: data.tipoVinculo,
        especialidade: data.especialidade || null,
        dataIngresso: data.dataIngresso,
        status: data.status,
      })
      .returning();

    await db.insert(servidorNucleo).values({
      servidorId: inserted.id,
      nucleoId,
      isPrincipal: true,
      dataInicio: data.dataIngresso,
    });

    const created = await this.findById(inserted.id);
    if (!created) throw new Error("Falha ao recuperar servidor recém-inserido");
    return created;
  }

  async update(id: string, patch: Partial<Servidor>): Promise<Servidor> {
    // Atualiza campos do servidor
    const set: Partial<typeof servidores.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (patch.nome !== undefined) set.nome = patch.nome;
    if (patch.apelido !== undefined) set.apelido = patch.apelido;
    if (patch.matricula !== undefined) set.matricula = patch.matricula || null;
    if (patch.email !== undefined) set.email = patch.email;
    if (patch.cargo !== undefined) set.cargo = patch.cargo;
    if (patch.tipoVinculo !== undefined) set.tipoVinculo = patch.tipoVinculo;
    if (patch.especialidade !== undefined)
      set.especialidade = patch.especialidade || null;
    if (patch.dataIngresso !== undefined) set.dataIngresso = patch.dataIngresso;
    if (patch.status !== undefined) set.status = patch.status;

    await db.update(servidores).set(set).where(eq(servidores.id, id));

    // Se mudou o núcleo principal, encerra vínculo anterior e cria novo
    if (patch.nucleoPrincipal !== undefined) {
      const newNucleoId = await nucleoIdByName(patch.nucleoPrincipal);

      const today = new Date().toISOString().slice(0, 10);
      await db
        .update(servidorNucleo)
        .set({ dataFim: today })
        .where(
          and(
            eq(servidorNucleo.servidorId, id),
            eq(servidorNucleo.isPrincipal, true),
            isNull(servidorNucleo.dataFim),
          ),
        );

      await db.insert(servidorNucleo).values({
        servidorId: id,
        nucleoId: newNucleoId,
        isPrincipal: true,
        dataInicio: today,
        motivo: "reorganização de vínculo principal",
      });
    }

    const updated = await this.findById(id);
    if (!updated) throw new Error("Servidor não encontrado após update");
    return updated;
  }

  async delete(id: string): Promise<void> {
    await db.delete(servidores).where(eq(servidores.id, id));
    // servidor_nucleo cascatiza via FK
    void dsql; // silence unused import in tree-shaking
  }
}
